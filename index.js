/**
 * MileageTrack — Entry Point
 *
 * The background location task MUST be defined before any React code loads.
 */

// 1. Register background task FIRST — before any React rendering
import './tasks/background-location';

// 2. Hand off to expo-router
import 'expo-router/entry';
