import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import RouteMap from "./RouteMap";
import AddressMiniMap from "./AddressMiniMap";
import {
  MapPin,
  Navigation,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  CheckCircle2,
  Zap,
  Copy,
  Play,
  Locate,
  Save,
  FolderOpen,
  Share2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Flag
} from "lucide-react";
import {
  isPostcodeLike,
  computeBiasCenter,
  searchPostcodes,
  resolvePostcode,
  searchAddresses
} from "../services/addressSearch";
import { useAddressMemory } from "../contexts/AddressMemoryContext";

const RoutePlanner = () => {
  const [addresses, setAddresses] = useState([]);
  const [currentAddress, setCurrentAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const activeSearchControllerRef = useRef(null);
  const { frequentAddresses, recordAddressUse } = useAddressMemory();
  const [expandedAddressId, setExpandedAddressId] = useState(null);

  // Load saved routes on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedRoutes');
      if (saved) {
        setSavedRoutes(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading saved routes:', err);
    }
  }, []);

  // Show temporary notifications
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Postcode-aware, cancellation-safe address search
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    if (activeSearchControllerRef.current) {
      activeSearchControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeSearchControllerRef.current = controller;

    setIsSearching(true);

    try {
      if (isPostcodeLike(query)) {
        const postcodes = await searchPostcodes(query, controller.signal);

        if (postcodes.length === 0) {
          showError('No matching postcodes found.');
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(
          postcodes.map(postcode => ({
            address: postcode,
            postcode,
            isPostcodeSuggestion: true
          }))
        );
      } else {
        const biasCenter = computeBiasCenter(addresses);
        const suggestions = await searchAddresses(query, biasCenter, controller.signal);

        if (suggestions.length === 0) {
          showError('No addresses found. Try a different search term.');
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(suggestions);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Address search error:', error);
      showError('Unable to search addresses. Please check your connection.');
      setAddressSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current location using browser geolocation
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${latitude}&lon=${longitude}&format=json`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();

      const currentLocationAddress = {
        address: data.display_name || 'Current Location',
        postcode: data.address?.postcode || 'N/A',
        latitude,
        longitude,
        type: 'current_location',
        id: Date.now()
      };

      setAddresses([currentLocationAddress, ...addresses]);
      showSuccess('Current location added!');
    } catch (error) {
      console.error('Geolocation error:', error);
      showError('Unable to get your location. Please enable location services.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (currentAddress) {
        searchAddress(currentAddress);
      } else {
        setAddressSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [currentAddress]);

  const addAddress = async (address) => {
    if (address.isPostcodeSuggestion) {
      try {
        const resolved = await resolvePostcode(address.postcode, new AbortController().signal);
        const newAddress = {
          address: resolved.postcode,
          postcode: resolved.postcode,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          type: 'postcode',
          id: Date.now()
        };
        setAddresses([...addresses, newAddress]);
        recordAddressUse(newAddress).catch(() => {});
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Postcode resolve error:', error);
        showError('Unable to resolve that postcode. Please try again.');
        return;
      }
    } else {
      const newAddress = { ...address, id: Date.now() };
      setAddresses([...addresses, newAddress]);
      recordAddressUse(newAddress).catch(() => {});
    }

    setCurrentAddress("");
    setAddressSuggestions([]);
  };

  const removeAddress = (id) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    if (addresses.length <= 1) {
      setOptimizedRoute(null);
    }
  };

  const moveAddress = (index, direction) => {
    const newAddresses = [...addresses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= addresses.length) return;

    [newAddresses[index], newAddresses[targetIndex]] =
    [newAddresses[targetIndex], newAddresses[index]];

    setAddresses(newAddresses);
  };

  // Move an address to the top of the list — the first stop is the route's
  // start point (optimizeRoute always begins from index 0).
  const makeStart = (index) => {
    if (index === 0) return;
    const newAddresses = [...addresses];
    const [addr] = newAddresses.splice(index, 1);
    newAddresses.unshift(addr);
    setAddresses(newAddresses);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Save current route
  const saveRoute = () => {
    if (addresses.length === 0) {
      showError('No addresses to save');
      return;
    }

    const routeName = prompt('Enter a name for this route:');
    if (!routeName) return;

    const newRoute = {
      id: Date.now().toString(),
      name: routeName,
      addresses,
      optimizedRoute,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedRoutes, newRoute];
    setSavedRoutes(updated);
    localStorage.setItem('savedRoutes', JSON.stringify(updated));
    showSuccess(`Route "${routeName}" saved!`);
  };

  // Load a saved route
  const loadRoute = (route) => {
    setAddresses(route.addresses);
    setOptimizedRoute(route.optimizedRoute);
    showSuccess(`Route "${route.name}" loaded!`);
  };

  // Delete a saved route
  const deleteSavedRoute = (routeId) => {
    const updated = savedRoutes.filter(r => r.id !== routeId);
    setSavedRoutes(updated);
    localStorage.setItem('savedRoutes', JSON.stringify(updated));
    showSuccess('Route deleted');
  };

  // Share route
  const shareRoute = async () => {
    if (addresses.length === 0) {
      showError('No route to share');
      return;
    }

    const routeText = addresses.map((addr, i) =>
      `${i + 1}. ${addr.address}`
    ).join('\n');

    const shareData = {
      title: 'My Route',
      text: `Route with ${addresses.length} stops:\n\n${routeText}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showSuccess('Route shared!');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.text);
        showSuccess('Route copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        showError('Unable to share route');
      }
    }
  };

  // Nearest Neighbor algorithm for route optimization
  const optimizeRoute = () => {
    if (addresses.length < 2) {
      showError("Please add at least 2 addresses to optimize");
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
      let current = coords[0];
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
        estimatedTime: Math.ceil(totalDistance / 30 * 60)
      });

      setAddresses(optimized);
      setIsOptimizing(false);
    }, 1000);
  };

  // Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
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

  const copyRouteToClipboard = async () => {
    const routeText = addresses.map((addr, i) =>
      `${i + 1}. ${addr.address}`
    ).join('\n');

    try {
      await navigator.clipboard.writeText(routeText);
      showSuccess('Route copied to clipboard!');
    } catch (error) {
      showError('Unable to copy to clipboard');
    }
  };

  // Navigation options
  const openInGoogleMaps = () => {
    if (addresses.length === 0) return;

    const waypoints = addresses.slice(1, -1).map(addr =>
      `${addr.latitude},${addr.longitude}`
    ).join('|');

    const origin = `${addresses[0].latitude},${addresses[0].longitude}`;
    const destination = `${addresses[addresses.length - 1].latitude},${addresses[addresses.length - 1].longitude}`;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;

    window.open(url, '_blank');
  };

  const openInWaze = () => {
    if (addresses.length === 0) return;

    // Waze deep link - navigate to first destination
    const firstStop = addresses[0];
    const url = `https://waze.com/ul?ll=${firstStop.latitude},${firstStop.longitude}&navigate=yes`;

    window.open(url, '_blank');
  };

  const openInAppleMaps = () => {
    if (addresses.length === 0) return;

    const firstStop = addresses[0];
    const url = `http://maps.apple.com/?daddr=${firstStop.latitude},${firstStop.longitude}&dirflg=d`;

    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto pb-safe px-4 py-6 space-y-6">
      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-500">{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

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
          Plan and optimize your delivery route
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section - second on mobile so Add Stops is immediately reachable,
            first (left) on large screens */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Route Map
                </span>
                {addresses.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {addresses.length} stops
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-64 sm:h-80 lg:h-[600px]">
                <RouteMap addresses={addresses} />
              </div>

              {/* Navigation Buttons */}
              {addresses.length > 0 && (
                <div className="mt-4 space-y-3">
                  <Button
                    onClick={() => setShowNavOptions(!showNavOptions)}
                    className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg font-semibold"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Navigation
                  </Button>

                  <AnimatePresence>
                    {showNavOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-3 gap-2"
                      >
                        <Button
                          onClick={openInGoogleMaps}
                          variant="outline"
                          className="flex flex-col gap-1 h-auto py-3"
                        >
                          <Navigation className="h-5 w-5 text-blue-600" />
                          <span className="text-xs">Google Maps</span>
                        </Button>
                        <Button
                          onClick={openInWaze}
                          variant="outline"
                          className="flex flex-col gap-1 h-auto py-3"
                        >
                          <Navigation className="h-5 w-5 text-cyan-600" />
                          <span className="text-xs">Waze</span>
                        </Button>
                        <Button
                          onClick={openInAppleMaps}
                          variant="outline"
                          className="flex flex-col gap-1 h-auto py-3"
                        >
                          <Navigation className="h-5 w-5 text-gray-600" />
                          <span className="text-xs">Apple Maps</span>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Address Input & List Section - first on mobile for the type-and-go
            morning workflow, right column on large screens */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* Address Search */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-primary" />
                Add Stops
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search UK address..."
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      onFocus={() => {
                        if (!currentAddress && frequentAddresses.length > 0) {
                          setAddressSuggestions(frequentAddresses);
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    variant="outline"
                    size="icon"
                    title="Use my location"
                  >
                    <Locate className={`h-4 w-4 ${isGettingLocation ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>

                {isSearching && (
                  <p className="text-sm text-muted-foreground">Searching...</p>
                )}

                {/* Address Suggestions */}
                <AnimatePresence>
                  {addressSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-1 max-h-60 overflow-y-auto"
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => addAddress(suggestion)}
                          className="w-full p-2 text-left text-sm bg-muted hover:bg-muted/80 rounded border border-border/50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            {suggestion.isPostcodeSuggestion ? (
                              <Navigation2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            ) : suggestion.isFrequentSuggestion ? (
                              <Clock className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs">{suggestion.address}</p>
                              {suggestion.isPostcodeSuggestion && (
                                <p className="text-[10px] text-muted-foreground">Postcode area</p>
                              )}
                              {suggestion.isFrequentSuggestion && (
                                <p className="text-[10px] text-muted-foreground">Frequently used</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={optimizeRoute}
                  disabled={addresses.length < 2 || isOptimizing}
                  className="bg-primary"
                  size="sm"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {isOptimizing ? "Optimizing..." : "Optimize"}
                </Button>

                <Button
                  onClick={saveRoute}
                  disabled={addresses.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>

                <Button
                  onClick={shareRoute}
                  disabled={addresses.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>

                <Button
                  onClick={() => setAddresses([])}
                  variant="outline"
                  disabled={addresses.length === 0}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Route Stats */}
          {optimizedRoute && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-emerald-500/50 bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-base">
                    <CheckCircle2 className="h-4 w-4" />
                    Optimized!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-xl font-bold text-emerald-600">{optimizedRoute.totalDistance} mi</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Est. Time</p>
                      <p className="text-xl font-bold text-emerald-600">{optimizedRoute.estimatedTime} min</p>
                    </div>
                  </div>

                  <Button
                    onClick={copyRouteToClipboard}
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-500/50 text-emerald-600"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Route
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Address List */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stops ({addresses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Search and add addresses above
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {addresses.map((address, index) => (
                    <div key={address.id}>
                      <div
                        className="flex items-start gap-2 p-2 bg-muted rounded border border-border/50 group"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex-shrink-0">
                          {index + 1}
                        </div>

                        <button
                          onClick={() => setExpandedAddressId(expandedAddressId === address.id ? null : address.id)}
                          className="flex-1 min-w-0 flex items-center gap-1 text-left"
                        >
                          {index === 0 && addresses.length > 1 && (
                            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              Start
                            </span>
                          )}
                          <span className="text-xs truncate flex-1">{address.address}</span>
                          {expandedAddressId === address.id ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>

                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            onClick={() => makeStart(index)}
                            disabled={index === 0}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title="Make this the start point"
                          >
                            <Flag className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => moveAddress(index, 'up')}
                            disabled={index === 0}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => moveAddress(index, 'down')}
                            disabled={index === addresses.length - 1}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => removeAddress(address.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedAddressId === address.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <AddressMiniMap
                              latitude={address.latitude}
                              longitude={address.longitude}
                              address={address.address}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Routes */}
          {savedRoutes.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Saved Routes ({savedRoutes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="flex items-center justify-between p-2 bg-muted rounded border border-border/50 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{route.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {route.addresses.length} stops
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => loadRoute(route)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                        >
                          <FolderOpen className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteSavedRoute(route.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
