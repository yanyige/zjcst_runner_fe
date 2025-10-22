Page({
  data: {
    record: null,
    route: [],
    polyline: [],
    center: null
  },
  onLoad(options) {
    if (options.record) {
      try {
        const record = JSON.parse(decodeURIComponent(options.record));
        const route = record.route ? JSON.parse(record.route) : [];
        const polyline = route.length
          ? [{
              points: route.map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
              color: '#1296dbDD',
              width: 4
            }]
          : [];
        const center = route.length
          ? {
              latitude: route[Math.floor(route.length / 2)].latitude,
              longitude: route[Math.floor(route.length / 2)].longitude
            }
          : null;
        this.setData({ record, route, polyline, center });
      } catch (error) {
        console.error('parse record error', error);
      }
    }
  }
});
