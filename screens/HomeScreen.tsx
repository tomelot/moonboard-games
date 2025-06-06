import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface Game {
  id: number;
  name: string;
  description: string;
  available: boolean;
  screen?: keyof RootStackParamList;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const games: Game[] = [
    {
      id: 1,
      name: 'Debug',
      description: 'Used to debuginng Moonboard',
      available: true,
      screen: 'Debug',
    },
    {
      id: 2,
      name: 'Snake',
      description: 'Classic snake',
      available: true,
      screen: 'Snake',
    },
  ];

  const handleGamePress = (game: Game) => {
    if (game.available && game.screen) {
      navigation.navigate('Loading', {
        nextScreen: game.screen,
        nextParams: {}
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.gearButton}
        onPress={() => navigation.navigate('Config')}
      >
        <Ionicons name="settings" size={24} color="#fff" />
      </TouchableOpacity>
    
      <Text style={styles.title}>Moonboard Games</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameCard,
              !game.available && styles.disabledCard
            ]}
            onPress={() => handleGamePress(game)}
            disabled={!game.available}
          >
            <Text style={styles.gameTitle}>{game.name}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
            {!game.available && (
              <Text style={styles.comingSoon}>Coming Soon</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 40,
  },
  gearButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    padding: 10,
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gameCard: {
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  gameDescription: {
    color: '#888',
    fontSize: 14,
  },
  comingSoon: {
    color: '#ffd700',
    marginTop: 8,
    fontStyle: 'italic',
  },
  disabledCard: {
    opacity: 0.6,
  },
});

export default HomeScreen;