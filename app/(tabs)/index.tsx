import { Image,Text, StyleSheet, Platform, Button, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import  Constants from 'expo-constants';
import React, { useRef, useEffect , useCallback, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  // init states
  //TODO: must be removed and given sub components for better performance
  const [cookies, setCookies] = useState(null);
  const [sessionStorageData, setSessionStorageData] = useState(null);
  const [localStorageData, setLocalStorageData] = useState(null);
  const webviewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  // get saved data from async storage

  // save data to async storage
  const storeData =  useCallback(async(key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('err', e);
    }
  },[]);
  // get data from async storage
  const getData = useCallback ( async(key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (e) {
      console.error('err', e);
    }
  },[]);
  // handle app state changes
  const handleAppStateChange =  useCallback(async(nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('opened');
    } else if (nextAppState.match(/inactive|background/)) {
      console.log('closed or idle');
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          (function() {
            const cookies = document.cookie;
            const sessionStorageData = JSON.stringify(sessionStorage);
            const localStorageData = JSON.stringify(localStorage);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'data',
              cookies: cookies,
              sessionStorage: sessionStorageData,
              localStorage: localStorageData
            }));
          })();
        `);
      }
    }
    appState.current = nextAppState;
  },[]);

  const handleMessage = useCallback((event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'data') {
      setCookies(data.cookies);
      setSessionStorageData(data.sessionStorage);
      setLocalStorageData(data.localStorage);
      storeData('cookies', data.cookies);
      storeData('sessionStorage', data.sessionStorage);
      storeData('localStorage', data.localStorage);
    }
  },[]);

  useEffect(() => {
    const loadData = async () => {
      const savedCookies = await getData('cookies');
      const savedSessionStorage = await getData('sessionStorage');
      const savedLocalStorage = await getData('localStorage');
      if (savedCookies) {
        setCookies(savedCookies);
      }
      if (savedSessionStorage) {
        setSessionStorageData(savedSessionStorage);
      }
      if (savedLocalStorage) {
        setLocalStorageData(savedLocalStorage);
      }
    };
    loadData();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);
  return (
  <><WebView
  ref={webviewRef}
    style={styles.container}
    source={{ uri: 'https://news.ycombinator.com/news' }}
    javaScriptEnabled={true}
    domStorageEnabled={true}
    onMessage={
    handleMessage
    }
  />
    <Text>cookies:{cookies}</Text>
    <Text>sessionStorage:{sessionStorageData}</Text>
    <Text>localStorage:{localStorageData}</Text>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
