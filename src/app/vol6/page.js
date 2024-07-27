"use client";
import { VertexShaderShadingComponent } from "@/components/vol6/VertexShaderShadingComponent.js";
import { FragmentShaderShadingComponent } from "@/components/vol6/FragmentShaderShadingComponent.js";

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
          <VertexShaderShadingComponent />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "16px",
          }}
        >
          <span>FragmentShaderShading</span>
          <FragmentShaderShadingComponent />
        </div>
      </div>
    </div>
  );
}
