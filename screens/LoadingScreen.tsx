import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import moonboardBLE from '../services/moonboardBLE';
import { BLE_UPDATE_STATE_EVENT_TYPE, BLEState, ConnectionStatus } from '../services/moonboardBLE';
import LottieView from 'lottie-react-native';

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;
type LoadingScreenRouteProp = RouteProp<RootStackParamList, 'Loading'>;

interface Props {
    navigation: LoadingScreenNavigationProp;
    route: LoadingScreenRouteProp;
}

const LoadingScreen = ({ navigation, route }: Props) => {
    const [error, setError] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

    const { nextScreen, nextParams } = route.params;

    useEffect(() => {
        const connectToDevice = async () => {
            try {
                const currentStatus = moonboardBLE.getStatus();
                setConnectionStatus(currentStatus);

                if (currentStatus === 'connected') {
                    navigation.replace(nextScreen, nextParams);
                    return;
                }

                await moonboardBLE.connect();
            } catch (err) {
                setError('Connection attempt failed');
                setShowError(true);
            }
        };

        const statusSubscription = moonboardBLE.addListener(
            BLE_UPDATE_STATE_EVENT_TYPE,
            (state: BLEState) => {
                setConnectionStatus(state.status);
                if (state.status === 'error') {
                    const errorMessage = state.message || 'Unknown error';
                    setError(errorMessage);
                    setShowError(true);
                } else if (state.status === 'connected') {
                    navigation.replace(nextScreen, nextParams);
                }
            }
        );

        connectToDevice();

        return () => {
            statusSubscription.remove();
        };
    }, [navigation, nextScreen, nextParams]);

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

            <View style={styles.progressContainer}>
                <LottieView
                    source={require('../assets/animations/loading.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                />
                <Text style={styles.statusText}>{connectionStatus}</Text>
            </View>
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
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    animation: {
        width: 200,
        height: 200,
    },
    statusText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 20,
        textAlign: 'center',
    },
});

export default LoadingScreen;
