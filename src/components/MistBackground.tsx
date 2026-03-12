"use client";

import { useEffect, useRef, useState } from "react";

const SHADER = /* wgsl */ `
struct Uniforms {
  time: f32,
  resolution: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

// Hash-based noise — reliable in WGSL
fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.13);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
  let ip = floor(p);
  let fp = fract(p);
  let sp = fp * fp * (3.0 - 2.0 * fp);

  let a = hash(ip + vec2f(0.0, 0.0));
  let b = hash(ip + vec2f(1.0, 0.0));
  let c = hash(ip + vec2f(0.0, 1.0));
  let d = hash(ip + vec2f(1.0, 1.0));

  return mix(mix(a, b, sp.x), mix(c, d, sp.x), sp.y);
}

fn fbm(p: vec2f) -> f32 {
  let n0 = 0.500 * noise(p);
  let n1 = 0.250 * noise(p * 2.0 + vec2f(1.7, 9.2));
  let n2 = 0.125 * noise(p * 4.0 + vec2f(5.3, 2.8));
  let n3 = 0.0625 * noise(p * 8.0 + vec2f(8.1, 4.5));
  let n4 = 0.03125 * noise(p * 16.0 + vec2f(3.4, 7.1));
  return n0 + n1 + n2 + n3 + n4;
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var out: VertexOutput;
  out.position = vec4f(pos[idx], 0.0, 1.0);
  out.uv = pos[idx] * 0.5 + 0.5;
  return out;
}

// Domain warping — feed noise into itself for turbulent rolling motion
fn warpedFbm(p: vec2f, t: f32) -> f32 {
  // First pass: get a displacement vector from noise
  let warpX = fbm(p + vec2f(t * 0.04, t * 0.03));
  let warpY = fbm(p + vec2f(t * 0.03, -t * 0.035) + vec2f(5.2, 1.3));

  // Second pass: sample noise at warped coordinates — creates rolling, turbulent motion
  let warped = p + vec2f(warpX, warpY) * 0.8;
  return fbm(warped + vec2f(-t * 0.02, t * 0.025));
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
  let res = max(u.resolution, vec2f(1.0));
  let uv = vec2f(in.uv.x * res.x / res.y, in.uv.y);
  let t = u.time;

  // Two warped layers at different scales for rolling fog
  let n1 = warpedFbm(uv * 2.5, t);
  let n2 = warpedFbm(uv * 1.5 + vec2f(7.3, 3.1), t * 0.8);

  // Combine layers
  let fog = n1 * 0.6 + n2 * 0.4;

  // High base fog + variation on top — mist everywhere, denser in some spots
  let density = 0.5 + 0.5 * smoothstep(0.2, 0.6, fog);

  // Cold Barovian mist — always visible, varies between gray and bright white
  let mistDark = vec3f(0.18, 0.19, 0.21);
  let mistLight = vec3f(0.55, 0.57, 0.56);

  let color = mix(mistDark, mistLight, density);

  // Subtle pulsing
  let pulse = 1.0 + sin(t * 0.3) * 0.04;

  return vec4f(color * pulse, 1.0);
}
`;

export function MistBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;

    async function init() {
      if (!navigator.gpu) {
        console.warn("WebGPU not supported, using CSS fallback mist");
        setUseFallback(true);
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) { console.warn("No WebGPU adapter"); setUseFallback(true); return; }
      const device = await adapter.requestDevice();
      if (destroyed) return;

      const context = canvas!.getContext("webgpu");
      if (!context) { console.warn("No WebGPU context"); setUseFallback(true); return; }

      console.log("WebGPU mist initialized successfully");

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: "opaque" });

      const uniformBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const shaderModule = device.createShaderModule({ code: SHADER });
      const shaderInfo = await shaderModule.getCompilationInfo();
      for (const msg of shaderInfo.messages) {
        console.warn(`Shader ${msg.type}: ${msg.message} (line ${msg.lineNum})`);
      }

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: shaderModule, entryPoint: "vs" },
        fragment: {
          module: shaderModule,
          entryPoint: "fs",
          targets: [{ format }],
        },
        primitive: { topology: "triangle-list" },
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      const startTime = performance.now();

      function render() {
        if (destroyed) return;

        const dpr = Math.min(window.devicePixelRatio, 2);
        const w = Math.floor(canvas!.clientWidth * dpr);
        const h = Math.floor(canvas!.clientHeight * dpr);
        if (canvas!.width !== w || canvas!.height !== h) {
          canvas!.width = w;
          canvas!.height = h;
        }

        const time = (performance.now() - startTime) / 1000;
        // vec2f requires 8-byte alignment, so pad after time
        const uniformData = new Float32Array([time, 0, w, h]);
        device.queue.writeBuffer(uniformBuffer, 0, uniformData);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: context!.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0.02, g: 0.02, b: 0.03, a: 1 },
          }],
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

        device.queue.submit([encoder.finish()]);
        rafRef.current = requestAnimationFrame(render);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    init();

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (useFallback) {
    return (
      <div
        className="mist-fallback"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          background: "radial-gradient(ellipse at center, #1a1c1e 0%, #0d0d0d 100%)",
          overflow: "hidden",
        }}
      >
        <div className="mist-layer mist-layer-1" />
        <div className="mist-layer mist-layer-2" />
        <div className="mist-layer mist-layer-3" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
