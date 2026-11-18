"use client";

// Brand-tinted take on the documented Three.js shader pattern:
// https://threejs.org/docs/#api/en/materials/ShaderMaterial
// Three is imported on demand, and never at all for reduced-motion visitors.
import { useEffect, useRef, useState } from "react";
import type * as Three from "three";

export interface ShaderAnimationProps {
  className?: string;
  /** Soft page backdrop the lines are drawn over. */
  base?: string;
  /** Main accent line colour. */
  rose?: string;
  /** Secondary accent line colour. */
  lavender?: string;
  /** Deep accent line colour. */
  plum?: string;
  /** Animation speed multiplier. */
  speed?: number;
}

type SceneRefs = {
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.Camera;
  geometry: Three.PlaneGeometry;
  material: Three.ShaderMaterial;
  uniforms: {
    time: { value: number };
    resolution: { value: Three.Vector2 };
  };
  frame: number;
};

function hexToVec(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return [0.66, 0.36, 0.45];
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const VERTEX_SHADER = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform vec3 uBase;
  uniform vec3 uRose;
  uniform vec3 uLav;
  uniform vec3 uPlum;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time * 0.05;
    vec3 color = uBase;
    for (int j = 0; j < 3; j++) {
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec3 tint = j == 0 ? uRose : (j == 1 ? uLav : uPlum);
        float phase = fract(t - 0.01 * float(j) + fi * 0.01) * 5.0;
        float distanceToLine = abs(phase - length(uv) + mod(uv.x + uv.y, 0.2));
        float glow = 0.0018 * (fi + 1.0) * (fi + 1.0) / (distanceToLine + 0.035);
        color = mix(color, tint, clamp(glow, 0.0, 0.5));
      }
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function ShaderAnimation({
  className,
  base = "#f9f5f3",
  rose = "#a95d73",
  lavender = "#6f5aa7",
  plum = "#4f3040",
  speed = 1,
}: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    let disposed = false;
    let inView = true;
    let refs: SceneRefs | null = null;
    let starting = false;

    setStill(reduced);

    function draw() {
      if (refs) refs.renderer.render(refs.scene, refs.camera);
    }

    function loop() {
      if (!refs || disposed) return;
      if (inView && !reduced && !document.hidden) {
        refs.uniforms.time.value += 0.05 * speed;
        draw();
      }
      refs.frame = requestAnimationFrame(loop);
    }

    function resize() {
      if (!refs || !container) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      refs.renderer.setSize(width, height);
      refs.uniforms.resolution.value.set(
        refs.renderer.domElement.width,
        refs.renderer.domElement.height,
      );
      draw();
    }

    async function start() {
      if (starting || refs || disposed) return;
      starting = true;
      try {
        const THREE = await import("three");
        if (disposed || !container) return;

        const uniforms = {
          time: { value: 1 },
          resolution: { value: new THREE.Vector2(1, 1) },
          uBase: { value: new THREE.Vector3(...hexToVec(base)) },
          uRose: { value: new THREE.Vector3(...hexToVec(rose)) },
          uLav: { value: new THREE.Vector3(...hexToVec(lavender)) },
          uPlum: { value: new THREE.Vector3(...hexToVec(plum)) },
        };
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
        });
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(geometry, material));
        const camera = new THREE.Camera();
        camera.position.z = 1;
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "low-power",
        });
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        container.appendChild(renderer.domElement);

        refs = { renderer, scene, camera, geometry, material, uniforms, frame: 0 };
        resize();
        if (!reduced) refs.frame = requestAnimationFrame(loop);
      } catch {
        // No WebGL (or the chunk failed): the CSS gradient below remains visible.
        setFailed(true);
      }
    }

    if (!reduced) void start();

    function onMotionChange() {
      reduced = motionQuery.matches;
      setStill(reduced);
      if (!refs) {
        if (!reduced) void start();
        return;
      }
      if (reduced) {
        cancelAnimationFrame(refs.frame);
        refs.frame = 0;
        draw();
      } else if (!refs.frame) {
        refs.frame = requestAnimationFrame(loop);
      }
    }

    function onVisibilityChange() {
      if (!refs || reduced || disposed) return;
      if (!document.hidden && inView && !refs.frame) refs.frame = requestAnimationFrame(loop);
    }

    motionQuery.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(
      (entries) => { inView = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    return () => {
      disposed = true;
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (refs) {
        cancelAnimationFrame(refs.frame);
        refs.renderer.domElement.remove();
        refs.geometry.dispose();
        refs.material.dispose();
        refs.renderer.dispose();
        refs = null;
      }
    };
  }, [base, rose, lavender, plum, speed]);

  return (
    <div ref={containerRef} aria-hidden="true" className={className}>
      {still || failed ? (
        <div
          className="size-full"
          style={{
            background:
              `radial-gradient(circle at 28% 34%, ${rose}22, transparent 42%), ` +
              `radial-gradient(circle at 72% 62%, ${lavender}1f, transparent 46%), ` +
              `linear-gradient(120deg, ${base}, ${base})`,
          }}
        />
      ) : null}
    </div>
  );
}

export default ShaderAnimation;
