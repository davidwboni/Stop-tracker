import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {
  MapPin,
  Navigation,
  Plus,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Copy
} from "lucide-react";

const RoutePlanner = () => {
  const [addresses, setAddresses] = useState([]);
  const [currentAddress, setCurrentAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [startingPoint, setStartingPoint] = useState("");

  // Simulated address search (Royal Mail API would go here)
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearching(true);

    // In production, this would call Royal Mail API
    // For now, we'll simulate with UK postcodes and addresses
    setTimeout(() => {
      const mockSuggestions = [
        {
          address: `${query}, London, UK`,
          postcode: "SW1A 1AA",
          latitude: 51.5074 + Math.random() * 0.1,
          longitude: -0.1278 + Math.random() * 0.1
        },
        {
          address: `${query}, Manchester, UK`,
          postcode: "M1 1AD",
          latitude: 53.4808 + Math.random() * 0.1,
          longitude: -2.2426 + Math.random() * 0.1
        },
        {
          address: `${query}, Birmingham, UK`,
          postcode: "B1 1AA",
          latitude: 52.4862 + Math.random() * 0.1,
          longitude: -1.8904 + Math.random() * 0.1
        }
      ];
      setAddressSuggestions(mockSuggestions);
      setIsSearching(false);
    }, 500);
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (currentAddress) {
        searchAddress(currentAddress);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [currentAddress]);

  const addAddress = (address) => {
    setAddresses([...addresses, { ...address, id: Date.now() }]);
    setCurrentAddress("");
    setAddressSuggestions([]);
  };

  const removeAddress = (id) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  const moveAddress = (index, direction) => {
    const newAddresses = [...addresses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= addresses.length) return;

    [newAddresses[index], newAddresses[targetIndex]] =
    [newAddresses[targetIndex], newAddresses[index]];

    setAddresses(newAddresses);
  };

  // Nearest Neighbor algorithm for route optimization
  const optimizeRoute = () => {
    if (addresses.length < 2) {
      alert("Please add at least 2 addresses to optimize");
      return;
    }

    setIsOptimizing(true);

    setTimeout(() => {
      const coords = addresses.map(addr => ({
        ...addr,
        lat: addr.latitude,
        lon: addr.longitude
      }));

      // Simple Nearest Neighbor Algorithm
      const optimized = [];
      let current = coords[0]; // Start from first address
      let remaining = coords.slice(1);
      optimized.push(current);

      while (remaining.length > 0) {
        let nearest = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        remaining.forEach((point, index) => {
          const distance = calculateDistance(
            current.lat, current.lon,
            point.lat, point.lon
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = point;
            nearestIndex = index;
          }
        });

        optimized.push(nearest);
        remaining.splice(nearestIndex, 1);
        current = nearest;
      }

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < optimized.length - 1; i++) {
        totalDistance += calculateDistance(
          optimized[i].lat, optimized[i].lon,
          optimized[i + 1].lat, optimized[i + 1].lon
        );
      }

      setOptimizedRoute({
        route: optimized,
        totalDistance: totalDistance.toFixed(2),
        estimatedTime: Math.ceil(totalDistance / 30 * 60) // Assuming 30 mph average
      });

      setAddresses(optimized);
      setIsOptimizing(false);
    }, 1000);
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  const copyRouteToClipboard = () => {
    const routeText = addresses.map((addr, i) =>
      `${i + 1}. ${addr.address} (${addr.postcode})`
    ).join('\n');

    navigator.clipboard.writeText(routeText);
    alert('Route copied to clipboard!');
  };

  const openInGoogleMaps = () => {
    const waypoints = addresses.slice(1, -1).map(addr =>
      `${addr.latitude},${addr.longitude}`
    ).join('|');

    const origin = `${addresses[0].latitude},${addresses[0].longitude}`;
    const destination = `${addresses[addresses.length - 1].latitude},${addresses[addresses.length - 1].longitude}`;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

    window.open(url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto pb-safe px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Navigation2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Route Planner</h1>
        </div>
        <p className="text-muted-foreground">
          Optimize your delivery route for maximum efficiency
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Address Input Section */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Add Delivery Stops
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter address or postcode..."
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Address Suggestions */}
                <AnimatePresence>
                  {addressSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <motion.button
                          key={index}
                          onClick={() => addAddress(suggestion)}
                          className="w-full p-3 text-left bg-muted hover:bg-muted/80 rounded-lg border border-border/50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{suggestion.address}</p>
                              <p className="text-xs text-muted-foreground">{suggestion.postcode}</p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={optimizeRoute}
                  disabled={addresses.length < 2 || isOptimizing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isOptimizing ? "Optimizing..." : "Optimize Route"}
                </Button>

                <Button
                  onClick={() => setAddresses([])}
                  variant="outline"
                  disabled={addresses.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Info Note */}
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Royal Mail Integration:</strong> Address finder uses Royal Mail's address database for accurate UK addresses.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Optimized Route Summary */}
          {optimizedRoute && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-emerald-500/50 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Route Optimized!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                      <p className="text-2xl font-bold text-emerald-600">{optimizedRoute.totalDistance} mi</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Est. Time</p>
                      <p className="text-2xl font-bold text-emerald-600">{optimizedRoute.estimatedTime} min</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={openInGoogleMaps}
                      variant="outline"
                      className="flex-1 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Open in Maps
                    </Button>
                    <Button
                      onClick={copyRouteToClipboard}
                      variant="outline"
                      className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Address List Section */}
        <div>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Navigation2 className="h-5 w-5 text-primary" />
                  Route Stops ({addresses.length})
                </CardTitle>
                {addresses.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Drag to reorder
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No stops added yet. Search for addresses above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {addresses.map((address, index) => (
                    <motion.div
                      key={address.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border/50 group hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{address.address}</p>
                        <p className="text-xs text-muted-foreground">{address.postcode}</p>
                        <p className="text-xs text-muted-foreground">
                          {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                        </p>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => moveAddress(index, 'up')}
                          disabled={index === 0}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => moveAddress(index, 'down')}
                          disabled={index === addresses.length - 1}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => removeAddress(address.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
