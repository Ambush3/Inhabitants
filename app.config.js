// Dynamic Expo config. Reads the static app.json (passed in as `config`) and
// injects the native Google Maps SDK key from the environment so the key stays
// out of version control. Set GOOGLE_MAPS_API_KEY in .env locally and in the
// EAS environment for cloud builds.
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
