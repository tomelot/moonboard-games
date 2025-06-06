import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import ConfigService, { DEFAULT_MTU, DEFAULT_DELAY } from '../services/ConfigService';
import moonboardBLE from '../services/moonboardBLE';

const ConfigScreen: React.FC = () => {
  const [mtuInput, setMtuInput] = useState(ConfigService.mtu.toString());
  const [delayInput, setDelayInput] = useState(ConfigService.delay.toString());

  const handleMtuChange = (text: string) => {
    setMtuInput(text);
    const value = parseInt(text) || DEFAULT_MTU;
    ConfigService.mtu = value;
  };

  const handleDelayChange = (text: string) => {
    setDelayInput(text);
    const value = parseFloat(text) || DEFAULT_DELAY;
    ConfigService.delay = value;
  };

  const handleResetBLE = async () => {
    try {
      await moonboardBLE.disconnect();
    } catch (err) {
      console.warn('Failed to disconnect:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>{`Packet MTU (max ${DEFAULT_MTU} bytes)`}</Text>
        <TextInput
          style={styles.input}
          value={mtuInput}
          onChangeText={handleMtuChange}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Packet Delay (milliseconds)</Text>
        <TextInput
          style={styles.input}
          value={delayInput}
          onChangeText={handleDelayChange}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={handleResetBLE}>
        <Text style={styles.resetButtonText}>Reset BLE Connection</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  section: {
    marginBottom: 25,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2e2e2e',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  resetButton: {
    marginTop: 40,
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConfigScreen;
