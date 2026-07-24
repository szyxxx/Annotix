# Engineering & Product Principles

## 1. Product First
We prioritize delivering usable features to the end-user. Architectural purity is a means to an end, not the end itself. We do not invent abstractions (Managers, Coordinators, Facades) unless dictated by absolute necessity.

## 2. Vertical Slice Development
Features are built end-to-end. A milestone is not "The Database Layer". A milestone is "The Workspace Dashboard" which inherently requires UI, Runtime, Service, and Database layers to be completed together.

## 3. Definition of Done (DoD)
No feature is merged unless it meets the DoD:
- UI Complete
- Runtime Complete
- Service Complete
- Repository & Adapters Complete
- Architecture Validation Checklist passes
- Tested (Unit/Integration)
- Documented

## 4. UI Aesthetics
Annotix must feel like a premium, professional tool from the first click. We utilize rich aesthetics, glassmorphism, precise typography, and subtle micro-animations to build trust and authority.
