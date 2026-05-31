import { createControlComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet-routing-machine";
import "@gegeweb/leaflet-routing-machine-openroute";

const createRoutingMachineLayer = (props) => {
  const { waypoints, ...otherOptions } = props;
  
  // Use the ORS-specific router
  const osrRouter = L.Routing.openrouteservice(process.env.REACT_APP_ORS_API_KEY, {
    "timeout": 60 * 1000, // Increased to 60 seconds
    "format": "json",
    "host": "https://api.openrouteservice.org",
    "service": "directions",
    "api_version": "v2",
    "profile": "driving-car"
  });
  
  const instance = L.Routing.control({
    waypoints: waypoints || [],
    router: osrRouter,
    routeWhileDragging: false,
    addWaypoints: false,
    createMarker: () => null,
    lineOptions: {
      styles: [{
        color: 'orange',
        weight: 4,
        opacity: 0.9,
        dashArray: "8, 8"
      }]
    },
    show: false,
    ...otherOptions
  });

  return instance;
};

const RoutingMachine = createControlComponent(createRoutingMachineLayer);
export default RoutingMachine;
