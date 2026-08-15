"use client";
import { ShaderShadingComponent } from "@/components/vol6/ShaderShadingComponent.js";

export default function Page() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginRight: "16px",
          }}
        >
          <span>VertexShaderShading</span>
          <ShaderShadingComponent
            canvasId="webgl-canvas-1"
            vertexShaderPath="/vol6/shader/VertexShaderShading/main.vert"
            fragmentShaderPath="/vol6/shader/VertexShaderShading/main.frag"
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "16px",
          }}
        >
          <span>FragmentShaderShading</span>
          <ShaderShadingComponent
            canvasId="webgl-canvas-2"
            vertexShaderPath="/vol6/shader/FragmentShaderShading/main.vert"
            fragmentShaderPath="/vol6/shader/FragmentShaderShading/main.frag"
          />
        </div>
      </div>
    </div>
  );
}
