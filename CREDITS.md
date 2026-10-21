# Credits

## 3D car model

`frontend/public/models/papaya-f1.glb` is a modified version of:

> This work is based on "Ferrari F1-75" (https://sketchfab.com/3d-models/ferrari-f1-75-06454e0f23a44fcdabcc7808aee6caf9) by Sketcher (https://sketchfab.com/sketcher987654321) licensed under CC-BY-NC-4.0 (http://creativecommons.org/licenses/by-nc/4.0/)

Changes: chassis livery replaced with a neutral shading map (colour applied at runtime per team theme), all sponsor decals and wordmarks removed, mesh simplified, textures converted to WebP, meshopt-compressed.

**Non-commercial use only.** This project must not be used commercially while this model is included.

## Data

Historical race data from OpenF1, Jolpica (Ergast mirror) and MultiViewer circuit geometry — see `docs/DATA_SOURCES_AND_PROVENANCE.md`.

## UI components

Ferrofluid, Noise, Magnet, ClickSpark and ScrollVelocity from React Bits (https://reactbits.dev).

## Visual references

Design studied (not copied) from landonorris.com, the Dropbox × McLaren page, and Dribbble shots by Meher Ali, Koka Papaskua, aref karami and Renat Muratshin. The light-reveal car technique follows rqphy/LightExperience.

## Traffic cone

`frontend/public/models/cone.glb` is based on "Traffic Cone" by hinndia (https://sketchfab.com/3d-models/traffic-cone-573feef839d7450cb3e12da9986e7a98), licensed CC BY 4.0, via the Khronos glTF Sample Assets (TrafficCone). Reduced to one cone, simplified to ~1k triangles, WebP textures, meshopt (24 KB).

## Garage props

Desk, LED monitors, barstools and tyre stacks are original low-poly geometry built in code (`frontend/src/components/three/GarageProps.tsx`), modelled after reference designs on free3d / TurboSquid. No third-party files used.
