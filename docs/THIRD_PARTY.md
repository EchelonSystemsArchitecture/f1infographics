# Third-Party Vendored Components

Components in `frontend/src/components/bits/` are vendored from [React Bits](https://www.reactbits.dev) ([GitHub: DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)).

**License:** MIT + Commons Clause License Condition v1.0 — Copyright (c) 2026 David Haz. Free for personal and commercial use inside applications; the components themselves may not be sold, sublicensed, or redistributed as a standalone product or ported bundle. Full text: <https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md>. Each vendored TSX file carries a one-line attribution comment.

**Conversion notes:** All four components were taken from the repo's `src/ts-default/` variants (already TypeScript, no Tailwind). Each was rewritten to use co-located plain CSS (no Tailwind, no CSS-in-JS styling objects for static styles) with CSS custom properties and class names prefixed `gt-` to match GRIDTRACE design tokens. Dynamic styles computed at runtime (transforms, per-frame values) remain inline by design.

| Component | Source | License | Notes |
| --- | --- | --- | --- |
| `CountUp` | <https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/CountUp/CountUp.tsx> | MIT + Commons Clause | Uses `motion` (`animate`, `useInView`) — already a project dependency. Static styles moved to `CountUp.css` (`--gt-countup-*`). |
| `DecryptedText` | <https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/DecryptedText/DecryptedText.tsx> | MIT + Commons Clause | Uses `motion/react` (`HTMLMotionProps`) — already a project dependency. Static styles moved to `DecryptedText.css` (`gt-decrypt-*`). Chosen instead of SplitText/ScrambledText, which require GSAP (not a project dependency). |
| `AnimatedList` | `src/ts-default/Components/AnimatedList/AnimatedList.tsx` + `AnimatedList.css` ([repo](https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/AnimatedList)) | MIT + Commons Clause | Original CSS rewritten from `--al-*`/`.animated-list*` to `--gt-al-*`/`.gt-animated-list*`. The upstream demo's `@hugeicons` default icons were removed (not a project dependency); pass icons via the `icon` prop or `renderItem` instead. |
| `SplitFlapText` | `src/ts-default/TextAnimations/SplitFlapText/SplitFlapText.tsx` + `SplitFlapText.css` ([repo](https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/SplitFlapText)) | MIT + Commons Clause | Original CSS rewritten from `--split-flap-*`/`.split-flap-text*` to `--gt-sf-*`/`.gt-split-flap-text*`; keyframes renamed with `gt-` prefix. |
