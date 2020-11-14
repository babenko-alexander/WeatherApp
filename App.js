import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import MapView, {Marker} from 'react-native-maps';
import Image from 'react-native-scalable-image';
import Modal from 'react-native-modal';

import axios from 'axios';
import Geolocation from 'react-native-geolocation-service';

const markerImg = require('./icons/marker-sun.png');
const magnifierImg = require('./icons/magnifier.png');
const positionImg = require('./icons/position.png');
const navigateImg = require('./icons/navigate.png');

const App = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchIsOpened, setSearchIsOpened] = useState(false);
  const [city, setCity] = useState('');
  const [focusedLocation, setFocusedLocation] = useState({
    latitude: 50.431782,
    longitude: 30.516382,
    latitudeDelta: 3,
    longitudeDelta:
      (Dimensions.get('window').width / Dimensions.get('window').height) * 3,
  });
  const [markerLocation, setMarkerLocation] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [meteoData, setMeteoData] = useState(null);
  const [isModalOn, setModal] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    getCoords();
  }, []);

  useEffect(() => {
    const fetchWeatherWithLocation = () => {
      axios(
        `https://api.openweathermap.org/data/2.5/weather?lat=${focusedLocation.latitude}&lon=${focusedLocation.longitude}&appid=56313cebd08ed7f58bce1d00f23b4f94`,
      )
        .then((result) => {
          const {main, weather, wind, sys} = result.data;
          setMeteoData({main, weather, wind, sys});
          setCity(result.data.name);
        })
        .catch(() => {
          setModal('error');
        });
    };
    fetchWeatherWithLocation();
  }, [focusedLocation]);

  const fetchWeatherWithCity = useCallback((searchValue) => {
    axios(
      `https://api.openweathermap.org/data/2.5/weather?q=${searchValue}&appid=46360d8aab369fe07300493a0466d18a`,
    )
      .then((result) => {
        const cityCoordinates = {
          latitude: result.data.coord.lat,
          longitude: result.data.coord.lon,
        };
        setCity(result.data.name);
        setMarkerLocation(cityCoordinates);
        setFocusedLocation({
          ...focusedLocation,
          ...cityCoordinates,
        });
      })
      .catch(() => {
        setModal('error');
      });
    setSearchValue('');
  });

  requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Geolocation Permission',
          message: 'Application needs access to your geolocation',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use the geolocation');
      } else {
        console.log('Geolocation permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  getCoords = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        let userCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserCoords(userCoords);
        setFocusedLocation({...focusedLocation, ...userCoords});
      },
      (error) => {
        console.log(error.code, error.message);
      },
      {enableHighAccuracy: true, timeout: 5000, maximumAge: 10000},
    );
  };

  const CollapsedView = useCallback(
    (props) => {
      const openSearchPanel = useRef(new Animated.Value(65)).current;
      const collapseSearchPanel = useRef(new Animated.Value(400)).current;

      useEffect(() => {
        Animated.timing(openSearchPanel, {
          toValue: 400,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      }, [openSearchPanel]);

      useEffect(() => {
        Animated.timing(collapseSearchPanel, {
          toValue: 65,
          duration: 1500,
          useNativeDriver: false,
        }).start();
      }, [collapseSearchPanel]);

      {
        return (
          <Animated.View
            style={{
              ...props.style,
              width: searchIsOpened ? openSearchPanel : collapseSearchPanel,
            }}>
            {props.children}
          </Animated.View>
        );
      }
    },
    [searchIsOpened],
  );

  return (
    <>
      <Modal onBackdropPress={() => setModal(false)} isVisible={!!isModalOn}>
        {isModalOn && isModalOn !== 'error' && (
          <View style={styles.modalWrapper}>
            <Text style={styles.modalHeader}>Weather forcast for {city}:</Text>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                <Text style={styles.boldText}>Generalized: </Text>
                {meteoData.weather[0].description}
              </Text>
              <Text style={styles.modalText}>
                <Text style={styles.boldText}>Temperature: </Text>
                {meteoData.main.temp} K |{' '}
                {(meteoData.main.temp - 273.15).toFixed(2)} °C
              </Text>
              <Text style={styles.modalText}>
                <Text style={styles.boldText}>Humidity: </Text>
                {meteoData.main.humidity} percent
              </Text>
              <Text style={styles.modalText}>
                <Text style={styles.boldText}>Wind speed: </Text>
                {meteoData.wind.speed} m/s
              </Text>
            </View>
          </View>
        )}
        {isModalOn === 'error' && (
          <Text style={styles.errorText}>
            Error with getting information from server
          </Text>
        )}
      </Modal>
      <StatusBar
        translucent={true}
        backgroundColor={isModalOn ? '#4D4D4D' : 'transparent'}
        barStyle="dark-content"
      />
      <View style={styles.container}>
        <MapView
          onLongPress={(event) => {
            const coordinates = event.nativeEvent.coordinate;
            setFocusedLocation({
              ...focusedLocation,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            });
          }}
          onPress={(event) => {
            const coordinates = {
              latitude: event.nativeEvent.coordinate.latitude,
              longitude: event.nativeEvent.coordinate.longitude,
            };
            setMarkerLocation(coordinates);
            setFocusedLocation({
              ...focusedLocation,
              ...coordinates,
            });
          }}
          style={styles.map}
          initialRegion={focusedLocation}
          region={focusedLocation}
          showsCompass
          moveOnMarkerPress={false}>
          {markerLocation && (
            <Marker
              onPress={() => {
                setFocusedLocation({
                  ...focusedLocation,
                  ...markerLocation,
                });
              }}
              coordinate={markerLocation}
              image={markerImg}
            />
          )}
          {userCoords && (
            <Marker
              onPress={() => {
                setFocusedLocation({
                  ...focusedLocation,
                  ...userCoords,
                });
              }}
              coordinate={userCoords}
              image={positionImg}
            />
          )}
        </MapView>
        {searchValue || city ? (
          <TouchableOpacity
            onPress={
              searchValue
                ? () => {
                    fetchWeatherWithCity(searchValue);
                  }
                : () => setModal(true)
            }
            style={styles.buttonBox}>
            {searchValue ? (
              <Text style={styles.buttonText}>
                Search for <Text style={styles.boldText}>{searchValue}</Text>
              </Text>
            ) : (
              <Text style={styles.buttonText}>
                Show weather forecast for{' '}
                <Text style={styles.boldText}>{city}</Text>
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      <CollapsedView>
        <View style={styles.searchBox}>
          <View style={styles.rowFlex}>
            <Image
              onPress={() => setSearchIsOpened(!searchIsOpened)}
              width={60}
              source={magnifierImg}
            />
            <TextInput
              onChangeText={(text) => setSearchValue(text)}
              value={searchValue}
              placeholder={'Enter city to find'}
              style={{opacity: searchIsOpened ? 1 : 0}}
            />
          </View>
          <Image
            onPress={useCallback(() => {
              getCoords();
            })}
            width={50}
            source={navigateImg}
            style={{opacity: searchIsOpened ? 1 : 0}}
          />
        </View>
      </CollapsedView>
    </>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    padding: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
  },
  modalHeader: {fontSize: 22, fontWeight: '700', marginBottom: 20},
  modalBody: {width: '100%', alignItems: 'flex-start'},
  modalText: {fontSize: 18},
  errorText: {
    color: '#FFF',
    fontSize: 28,
    textAlign: 'center',
  },

  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonBox: {
    backgroundColor: '#4A944B',
    padding: 10,
    width: '90%',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 30,
  },
  buttonText: {fontSize: 18, color: '#FFF', textAlign: 'center'},
  searchBox: {
    position: 'absolute',
    top: 30,
    left: 10,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    width: '95%',
    borderRadius: 15,
  },

  boldText: {fontWeight: '700'},
  rowFlex: {flexDirection: 'row'},
});

export default App;
