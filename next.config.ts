import type { NextConfig } from 'next';

// No redirects: "/" is the hub home (search, followed athletes, next comps).
// It used to redirect to /events, which hid the home page entirely.
const nextConfig: NextConfig = {};

export default nextConfig;
