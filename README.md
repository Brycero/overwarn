# Overwarn: Live Weather Alert Overlay

Overwarn is a real-time weather alert overlay for weather live streams. It fetches and displays active National Weather Service (NWS) warnings and watches in a visually prominent, broadcast-style overlay. The overlay cycles through active alerts, showing their type, affected states/counties, and expiration times.

![Screenshot of Overwarn](https://i.imgur.com/BMswS73.png)

## How To Use

The easiest way to use Overwarn is on [the website](https://overwarn.mirra.tv). From there, you can embed Overwarn as a browser source in OBS Studio, Streamlabs Desktop, Meld Studio, or any other streaming application that supports browser sources. The recommended size is 1920x1080.

## Features

- **Live NWS Alerts:** Fetches active warnings and watches from the [National Weather Service API](https://api.weather.gov/alerts/active).
- **Customizable:** Easily customize the overlay to your liking, with filters for states, weather forecast offices, and alert types, and adjust alert colors.
- **New Alerts:** Overwarn automatically fetches and displays new alerts as they are issued, playing an sound and showing a "NEW" indicator.
- **Alert Types:** Supports different types of Tornado Warnings, Severe Thunderstorm Warnings, Flash Flood Warnings, Winter Storm Warnings, and Watches.
- **Simple Overlay:** Displays alert type, affected area (states/counties), time remaining, and expiration time in a bold, easy-to-read overlay.
- **Animated Cycling:** Automatically cycles through all active alerts with smooth transitions.
- **Timezone-Aware:** Shows expiration times in the correct local timezone.
- **Query Strings:** Supports URL query strings so you can easily paste your settings across multiple apps and devices.

## Self-Hosting

Since Overwarn is open source, you can download and run your own version of Overwarn locally. Simply follow the instructions below, which are the same for any other Next.js application.

### Prerequisites

- [Node.js](https://nodejs.org)
- [Git](https://git-scm.com)

### Steps

1. **Download the code:**

   ```bash
   git clone https://github.com/brycero/overwarn.git
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser:**

   Visit [http://localhost:3000](http://localhost:3000) to see the overlay in action.

## Why Use Overwarn?

Simply put - the alternatives to Overwarn are either too complicated or too expensive. With Overwarn:
- Use it straight out of the box from our website for free.
- Host your own version yourself.
- Fork Overwarn and modify it to suit your exact needs.
- Help improve Overwarn by contributing any changes back to the original source code.

## Learn More

- [National Weather Service API Documentation](https://www.weather.gov/documentation/services-web-api)
- [Next.js Documentation](https://nextjs.org/docs)
- [Geist font](https://vercel.com/font)
- [Luxon](https://moment.github.io/luxon/#/)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)
- [Lucide](https://lucide.dev)

## License

Overwarn is licensed under GPL-3.0, making it free and open source. You do not need a license to use Overwarn as an overlay on your live streams. You may fork and modify Overwarn at your discretion, including for commercial or private use. However, per the license, when distributing a modified version of Overwarn, you must disclose the source code, include a copy of the license and copyright notice, and you must use the same license as the source material. Finally, any changes made to a modified fork of Overwarn must be clearly stated in order to avoid confusion with the original source material.

---

*Overwarn is not affiliated with the National Weather Service. Always consult official sources for critical weather information.*
