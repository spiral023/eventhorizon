import "leaflet";

declare module "leaflet" {
  interface MarkerCluster {
    getChildCount(): number;
  }

  interface MarkerClusterGroupOptions extends LayerOptions {
    showCoverageOnHover?: boolean;
    spiderfyOnMaxZoom?: boolean;
    zoomToBoundsOnClick?: boolean;
    maxClusterRadius?: number;
    disableClusteringAtZoom?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => Icon | DivIcon;
  }

  interface MarkerClusterGroup extends LayerGroup {
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    clearLayers(): this;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
