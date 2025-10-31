# **App Name**: SuccessArrow Tracker

## Core Features:

- User Authentication: Secure login/signup for admins, sales executives, distributors, and delivery partners using Supabase Auth.
- Outlet Management: Add, edit, and delete outlets. Use Google Places API for address auto-complete and geocode the location.
- Geofence Creation: Create geofences (150m radius) around outlets using Google Maps Circle API and save coordinates and radius in Supabase.
- Location Tracking: Track sales executives' live GPS position and detect entry/exit from geofences.
- Visit Logging: Log geofence entry/exit times in Supabase, including a manual 'Check-In' option. Send alerts when users enter/exit fences.
- Anomaly Detection: Use AI as a tool to detect visits that violate certain criteria (the criteria themselves can vary). If any criteria are violated, then issue an alert. Note: this requires admin input.
- Role-Based Dashboards: Dashboards with role-based views for admins, sales executives, distributors, and delivery partners, each showing relevant data.

## Style Guidelines:

- Primary color: Deep blue (#2E3192) to convey trust and reliability, in line with managing sensitive location data.
- Background color: Very light blue (#F0F4FF), complementing the deep blue and maintaining a professional look.
- Accent color: Bright green (#90EE90) to highlight key actions and alerts related to location and status.
- Headline font: 'Space Grotesk', a sans-serif font to convey a modern, computerized look.
- Body font: 'Inter', a grotesque-style sans-serif font to convey a machined, objective look.
- Use map-themed icons (location markers, routes, etc.)
- Card-based layout for displaying outlet and visit information.