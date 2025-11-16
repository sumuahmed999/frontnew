// distance-calculation.service.ts

import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';

declare var google: any;

export interface DistanceResult {
  distance: {
    text: string;
    value: number; // in meters
    km: number;    // in kilometers
  };
  duration: {
    text: string;
    value: number; // in seconds
    hours: number; // in decimal hours
    formatted: string; // "2h 30m"
  };
  status: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class DistanceCalculationService {

  constructor() {}

  /**
   * Calculate straight-line distance using Haversine formula
   * This is fast but doesn't consider roads/traffic
   */
  calculateStraightLineDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371; // Earth's radius in kilometers
    
    const lat1Rad = this.degToRad(coord1.latitude);
    const lat2Rad = this.degToRad(coord2.latitude);
    const deltaLatRad = this.degToRad(coord2.latitude - coord1.latitude);
    const deltaLngRad = this.degToRad(coord2.longitude - coord1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }

  /**
   * Calculate driving distance and time using Google Distance Matrix API
   * This considers actual roads and traffic
   */
  calculateDrivingDistanceAndTime(
    origins: Coordinate[], 
    destinations: Coordinate[],
    travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Observable<DistanceResult[][]> {
    
    if (!google || !google.maps) {
      return throwError('Google Maps API not loaded');
    }

    return new Observable(observer => {
      const service = new google.maps.DistanceMatrixService();
      
      const originLatLngs = origins.map(coord => 
        new google.maps.LatLng(coord.latitude, coord.longitude)
      );
      
      const destinationLatLngs = destinations.map(coord => 
        new google.maps.LatLng(coord.latitude, coord.longitude)
      );

      service.getDistanceMatrix({
        origins: originLatLngs,
        destinations: destinationLatLngs,
        travelMode: google.maps.TravelMode[travelMode],
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }, (response: any, status: string) => {
        
        if (status === 'OK') {
          const results: DistanceResult[][] = [];
          
          response.rows.forEach((row: any, originIndex: number) => {
            const rowResults: DistanceResult[] = [];
            
            row.elements.forEach((element: any, destIndex: number) => {
              if (element.status === 'OK') {
                const distanceKm = element.distance.value / 1000;
                const durationHours = element.duration.value / 3600;
                const formattedTime = this.formatDuration(element.duration.value);
                
                rowResults.push({
                  distance: {
                    text: element.distance.text,
                    value: element.distance.value,
                    km: Math.round(distanceKm * 100) / 100
                  },
                  duration: {
                    text: element.duration.text,
                    value: element.duration.value,
                    hours: Math.round(durationHours * 100) / 100,
                    formatted: formattedTime
                  },
                  status: element.status
                });
              } else {
                rowResults.push({
                  distance: { text: 'N/A', value: 0, km: 0 },
                  duration: { text: 'N/A', value: 0, hours: 0, formatted: 'N/A' },
                  status: element.status
                });
              }
            });
            
            results.push(rowResults);
          });
          
          observer.next(results);
          observer.complete();
        } else {
          observer.error(`Distance Matrix API error: ${status}`);
        }
      });
    });
  }

  /**
   * Calculate total route distance and time with multiple waypoints
   */
  calculateRouteWithWaypoints(
    startCoord: Coordinate,
    endCoord: Coordinate,
    waypoints: Coordinate[] = [],
    travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ): Observable<{totalDistance: number, totalDuration: number, legs: any[]}> {
    
    if (!google || !google.maps) {
      return throwError('Google Maps API not loaded');
    }

    return new Observable(observer => {
      const directionsService = new google.maps.DirectionsService();
      
      const waypointLatLngs = waypoints.map(coord => ({
        location: new google.maps.LatLng(coord.latitude, coord.longitude),
        stopover: true
      }));

      directionsService.route({
        origin: new google.maps.LatLng(startCoord.latitude, startCoord.longitude),
        destination: new google.maps.LatLng(endCoord.latitude, endCoord.longitude),
        waypoints: waypointLatLngs,
        travelMode: google.maps.TravelMode[travelMode],
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      }, (response: any, status: string) => {
        
        if (status === 'OK') {
          const route = response.routes[0];
          let totalDistance = 0;
          let totalDuration = 0;
          
          const legs = route.legs.map((leg: any) => {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
            
            return {
              startAddress: leg.start_address,
              endAddress: leg.end_address,
              distance: {
                text: leg.distance.text,
                value: leg.distance.value,
                km: Math.round((leg.distance.value / 1000) * 100) / 100
              },
              duration: {
                text: leg.duration.text,
                value: leg.duration.value,
                hours: Math.round((leg.duration.value / 3600) * 100) / 100,
                formatted: this.formatDuration(leg.duration.value)
              }
            };
          });
          
          observer.next({
            totalDistance: Math.round((totalDistance / 1000) * 100) / 100, // km
            totalDuration: Math.round((totalDuration / 3600) * 100) / 100, // hours
            legs: legs
          });
          observer.complete();
        } else {
          observer.error(`Directions API error: ${status}`);
        }
      });
    });
  }

  /**
   * Estimate travel time based on distance and average speed
   * Useful when Google APIs are not available
   */
  estimateTravelTime(distanceKm: number, averageSpeedKmh: number = 50): {
    hours: number;
    formatted: string;
  } {
    const hours = distanceKm / averageSpeedKmh;
    return {
      hours: Math.round(hours * 100) / 100,
      formatted: this.formatDuration(hours * 3600)
    };
  }

  /**
   * Calculate distance between multiple waypoints sequentially
   */
  calculateSequentialWaypointDistances(waypoints: Coordinate[]): {
    totalDistance: number;
    segments: Array<{from: number, to: number, distance: number}>;
  } {
    if (waypoints.length < 2) {
      return { totalDistance: 0, segments: [] };
    }

    let totalDistance = 0;
    const segments: Array<{from: number, to: number, distance: number}> = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const distance = this.calculateStraightLineDistance(waypoints[i], waypoints[i + 1]);
      segments.push({
        from: i,
        to: i + 1,
        distance: Math.round(distance * 100) / 100
      });
      totalDistance += distance;
    }

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      segments: segments
    };
  }

  // Helper methods
  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }
}
