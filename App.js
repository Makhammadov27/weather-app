import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const WEATHER_CODES = {
  0: ['Ochiq osmon', '☀️'],
  1: ['Asosan ochiq', '🌤️'],
  2: ['Qisman bulutli', '⛅'],
  3: ['Bulutli', '☁️'],
  45: ['Tuman', '🌫️'],
  48: ['Qirovli tuman', '🌫️'],
  51: ['Yengil yomg‘ir', '🌦️'],
  53: ['Yomg‘ir', '🌦️'],
  55: ['Kuchli yomg‘ir', '🌧️'],
  61: ['Yengil yomg‘ir', '🌦️'],
  63: ['Yomg‘ir', '🌧️'],
  65: ['Kuchli yomg‘ir', '🌧️'],
  71: ['Yengil qor', '🌨️'],
  73: ['Qor', '❄️'],
  75: ['Kuchli qor', '❄️'],
  80: ['Yomg‘ir yog‘ishi mumkin', '🌦️'],
  81: ['Yomg‘ir yog‘ishi mumkin', '🌧️'],
  82: ['Kuchli jala', '⛈️'],
  95: ['Momaqaldiroq', '⛈️'],
  96: ['Do‘l bilan momaqaldiroq', '⛈️'],
  99: ['Kuchli do‘l', '⛈️'],
};

const getWeather = (code) => WEATHER_CODES[code] || ['Noma’lum', '🌡️'];

const formatDay = (date) =>
  new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));

export default function App() {
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadWeather = useCallback(async (location) => {
    setError('');
    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current:
          'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
        forecast_days: '5',
      });

      const response = await fetch(`${FORECAST_URL}?${params.toString()}`);
      if (!response.ok) throw new Error('Forecast request failed');

      const data = await response.json();
      setPlace(location);
      setWeather(data);
    } catch {
      setError('Ma’lumotlarni yuklab bo‘lmadi. Internet aloqasini tekshiring.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeather({
      name: 'Toshkent',
      country: 'O‘zbekiston',
      latitude: 41.2647,
      longitude: 69.2163,
    });
  }, [loadWeather]);

  const searchCity = async () => {
    const city = query.trim();
    if (!city) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ name: city, count: '1', language: 'uz', format: 'json' });
      const response = await fetch(`${GEOCODING_URL}?${params.toString()}`);
      if (!response.ok) throw new Error('Search request failed');

      const data = await response.json();
      if (!data.results?.length) {
        setError('Shahar topilmadi. Boshqa nom bilan urinib ko‘ring.');
        setLoading(false);
        return;
      }

      await loadWeather(data.results[0]);
      setQuery('');
    } catch {
      setError('Qidiruvda xatolik yuz berdi.');
      setLoading(false);
    }
  };

  const onRefresh = () => {
    if (!place) return;
    setRefreshing(true);
    loadWeather(place);
  };

  const current = weather?.current;
  const daily = weather?.daily;
  const [condition, icon] = getWeather(current?.weather_code);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Ob-havo</Text>
        <Text style={styles.subtitle}>Dunyoning istalgan shahrini tekshiring</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchCity}
            placeholder="Shahar nomi..."
            placeholderTextColor="#9fb8e8"
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel="Shahar nomi"
          />
          <Pressable onPress={searchCity} style={styles.searchButton} accessibilityLabel="Qidirish">
            <Text style={styles.searchButtonText}>Qidirish</Text>
          </Pressable>
        </View>

        {loading && !weather ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : error && !weather ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.currentCard}>
              <Text style={styles.location}>{place?.name}</Text>
              <Text style={styles.country}>{place?.admin1 ? `${place.admin1}, ` : ''}{place?.country}</Text>
              <Text style={styles.weatherIcon}>{icon}</Text>
              <Text style={styles.temperature}>{Math.round(current?.temperature_2m)}°</Text>
              <Text style={styles.condition}>{condition}</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.detail}>His qilinadi: {Math.round(current?.apparent_temperature)}°</Text>
                <Text style={styles.detail}>💧 {current?.relative_humidity_2m}%</Text>
                <Text style={styles.detail}>💨 {Math.round(current?.wind_speed_10m)} km/soat</Text>
              </View>
            </View>

            {error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <Text style={styles.sectionTitle}>5 kunlik prognoz</Text>
            <View style={styles.forecastCard}>
              {daily?.time?.map((date, index) => {
                const [dayCondition, dayIcon] = getWeather(daily.weather_code[index]);
                return (
                  <View style={styles.forecastRow} key={date}>
                    <Text style={styles.day}>{index === 0 ? 'Bugun' : formatDay(date)}</Text>
                    <Text style={styles.forecastIcon}>{dayIcon}</Text>
                    <Text style={styles.forecastCondition}>{dayCondition}</Text>
                    <Text style={styles.temperatures}>
                      {Math.round(daily.temperature_2m_max[index])}° / {Math.round(daily.temperature_2m_min[index])}°
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.attribution}>Ma’lumot: Open-Meteo</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#2563eb' },
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  title: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 18 },
  subtitle: { color: '#dbeafe', fontSize: 15, marginTop: 4, marginBottom: 22 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    color: '#172554',
    fontSize: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#172554',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 50,
  },
  searchButtonText: { color: '#fff', fontWeight: '700' },
  loader: { marginTop: 80 },
  currentCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
  },
  location: { color: '#fff', fontSize: 26, fontWeight: '800' },
  country: { color: '#dbeafe', fontSize: 14, marginTop: 3 },
  weatherIcon: { fontSize: 70, marginTop: 14 },
  temperature: { color: '#fff', fontSize: 66, fontWeight: '200', lineHeight: 76 },
  condition: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 2 },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 22 },
  detail: { color: '#e0ecff', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10, marginTop: 26 },
  forecastCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16 },
  forecastRow: { alignItems: 'center', borderBottomColor: '#e5e7eb', borderBottomWidth: 1, flexDirection: 'row', minHeight: 62 },
  day: { color: '#172554', fontSize: 14, fontWeight: '700', width: 55 },
  forecastIcon: { fontSize: 25, width: 40 },
  forecastCondition: { color: '#64748b', flex: 1, fontSize: 12 },
  temperatures: { color: '#172554', fontSize: 13, fontWeight: '700' },
  messageCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 30 },
  errorText: { color: '#b91c1c', fontSize: 15, textAlign: 'center' },
  inlineError: { color: '#fee2e2', fontSize: 13, marginTop: 12, textAlign: 'center' },
  attribution: { color: '#bfdbfe', fontSize: 12, marginTop: 18, textAlign: 'center' },
});
