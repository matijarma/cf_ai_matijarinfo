# Matija Radeljak - Creative Producer + Systems Architect

> **Interactive CV / portfolio runtime** built as a retro multi-OS experience.
> 
> This repository is both my professional story and a technical playground for how I build things.

### **dev.matijar.info** 
> The LLM-powered Ubuntu shell was directly inspired by the Cloudflare summer internship bonus task "Cloudflare AI app assignment". 
- **site and app are in development** 
> Most likely at time of viewing the app holds little-to-none actual content. Given a lifetime of theatre, film, culture and software projects, its actually a much bigger task to properly fill and wire the content, and build the UX for consuming it, than developing the app logic. Because time is running out, I'm publishing this in-dev version.
- **LLM integration** 
> is only available in the Ubuntu shell and in my opinion still in the scafold phase. Fully developed, it will be presented probably as the Clippy assistant in Windows and as is now, a Linux shell in Ubuntu. 
- **Core idea**
> - Seeing the Cloudflare summer internship bonus task to build an app with Cloudflare LLM services, it arrived perfectly as the roundup to a few years old desire to build my portfolio site around a mockup OS
> - Besides a fun way to browse my CV and projects of all sorts, I believe it could be highly educational, especially in Linux shell where users can have the freedom and guidence to experiment with commands and understand what they do.
>>  Already existing implementation of BIOS, base Linux commands, msconfig, Task manager and other such details were baked in early on exactly for the purpose of having a educational purpose for the users foundationally. 

- **Architecture map** 
> Prompts and LLM architecture: [this static page](https://dev.matijar.info/architecture-map) 

## Who I am

Hi, I'm **Matija Radeljak** from Zagreb, Croatia.  
I work at the intersection of **film production**, **cultural development**, and **IT infrastructure**.

- 🎬 Founder / Creative Producer at **Aning Film**
- 🌍 Founder / President of **Umjetnost za sve** (Art for All), active since **April 15, 2011**
- 🛠️ Founder of **KompMajstor** (ICT consulting for SMB operations)
- 🧠 Background in long-form stage acting (started at age 7), direction, production, and systems thinking

## Contact

- 📧 `matija@matijar.info`
- 📧 `matija@aningfilm.hr`
- 📱 `+385 91 MATIJAR`
- 🌐 [dev.matijar.info](https://dev.matijar.info) (temp/test)
- 🎞️ [aningfilm.hr](https://aningfilm.hr)
- 💻 [kompmajstor.eu](https://kompmajstor.eu)

## What I do

### Creative + Production

- Develop and produce fiction, documentary, experimental, and cross-media projects
- Build long-horizon international collaborations and co-production paths
- Mentor filmmakers and run workshops (including programs for children and youth)
- Design narrative experiences that connect online and physical space

### Culture + Community

- Lead projects that treat art as public infrastructure, not just entertainment
- Work on initiatives like **Sunset Unije** and island/community-based cultural activation
- Build formats where culture, ecology, tourism, and local resilience meet

### IT + Systems

- Operate with a **lean, no-bloat engineering mindset**
- Focus on infrastructure, security hygiene, practical UX, and reliable delivery
- Run operational support for SMB websites and digital workflows

## Selected Highlights

- 🚀 **365 - Film For a Dime**: early micro-budget / crowdfunding and mobile-first storytelling model
- 🎥 **jedan (One, 2011)**: short fiction with international festival presence (including Cannes Short Film Corner)
- 🧬 **GlowBrain**: science communication through documentary + interactive media + event format
- 🚗 **Dude, I lost my culture (Twingo the filmmaker)**: cross-platform meta-documentary experiment
- 🎻 **Violinist**: experimental work and international collaboration
- 🌐 **Disuci u mramor (Breathing into Marble)**: feature co-production in a multinational framework
- 🏝️ **Sunset Unije / SURF**: long-format island festival model linking culture and local development

## Professional Philosophy

- ✅ **Art should be for everyone** (`Umjetnost za sve`)
- ✅ Build systems that survive real-world constraints
- ✅ Use technology as a tool, not noise
- ✅ Keep operations transparent, resilient, and human-centered

## How this repository works

This repo is an **interactive portfolio runtime** that simulates multiple OS shells (Win95, XP, Ubuntu terminal, Symbian-like mobile UI) and connects local commands with an optional Worker-based AI path.

For the full technical explanation, open:

- 🗺️ **[architecture-map.html](./architecture-map.html)**

That map visualizes:

- runtime modules and topology
- desktop/mobile entry paths
- terminal command flow
- Worker request lifecycle and response contracts
- filesystem overlays and UI event propagation

If you want implementation-level detail, start from the architecture map and then inspect `src/` and `worker/` from there.

## Quick Start

### Live test deployment
**This is a non-public live test until I fill it with actual content**

- 🌐 [dev.matijar.info](https://dev.matijar.info) 

### Deploy as Cloudflare Worker/Page

```bash
npx wrangler dev
```