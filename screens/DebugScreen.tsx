import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import moonboardBLE from '../services/moonboardBLE';
import { BLE_UPDATE_STATE_EVENT_TYPE, BLEState } from '../services/moonboardBLE';

type DebugScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Debug'>;

interface Props {
    navigation: DebugScreenNavigationProp;
}

const DebugScreen = ({ navigation }: Props) => {
    const [error, setError] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);
    const [sendText, setSendText] = useState('');

    useEffect(() => {
        if (moonboardBLE.getStatus() !== 'connected') {
            setError("Not connected!");
            setShowError(true);
        }

        const statusSubscription = moonboardBLE.addListener(
            BLE_UPDATE_STATE_EVENT_TYPE,
            (state: BLEState) => {
                if (state.status === 'error') {
                    const errorMessage = state.message || 'Unknown error';
                    setError(errorMessage);
                    setShowError(true);
                }
            }
        );

        return () => {
            statusSubscription.remove();
        };
    }, []);

    const handleSendData = async () => {
        try {
            await moonboardBLE.sendData(sendText);
        } catch (err) { }
        setSendText('');
    };

    const flashColors = async () => {
        const allIndices = Array.from({ length: 198 }, (_, i) => i);
        const colors = ['E', 'P', 'S']; // Red, Blue, Green

        for (const color of colors) {
            const cmd = 'l#' + allIndices.map(i => `${color}${i}`).join(',') + '#';
            try {
                await moonboardBLE.sendData(cmd);
                await new Promise(res => setTimeout(res, 400));
            } catch (err) {
                console.warn('Failed to flash color', err);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Modal visible={showError} transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.buttonText}>Return to Previous</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <TextInput
                    style={styles.input}
                    value={sendText}
                    onChangeText={setSendText}
                    onSubmitEditing={handleSendData}
                    placeholder="Enter Moonboard Command"
                    placeholderTextColor="#888"
                    returnKeyType="send"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={true}
                />

                <TouchableOpacity style={styles.flashButton} onPress={flashColors}>
                    <Text style={styles.buttonText}>Flash RGB Test</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    errorBox: {
        backgroundColor: '#d32f2f',
        padding: 25,
        borderRadius: 15,
        alignItems: 'center',
        width: '80%',
        elevation: 5,
    },
    errorText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: '#ffffff20',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#2a2a2a',
        color: 'white',
        fontSize: 16,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3a3a3a',
        marginVertical: 20,
    },
    flashButton: {
        backgroundColor: '#3366ff',
        paddingVertical: 14,
        paddingHorizontal: 25,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
});

export default DebugScreen;
