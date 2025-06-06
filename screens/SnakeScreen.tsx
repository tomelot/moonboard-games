import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moonboardBLE from '../services/moonboardBLE';
import ConfigService from '../services/ConfigService';

const ROWS = 18;
const COLS = 11;
const BASE_SPEED = 250;

const { width } = Dimensions.get('window');

type Direction = 'up' | 'down' | 'left' | 'right';
type Position = { row: number; col: number };

const directions: Record<Direction, [number, number]> = {
  up: [1, 0],
  down: [-1, 0],
  left: [0, -1],
  right: [0, 1]
};

const generateFood = (snakeBody: Position[]): Position => {
  let newFood: Position;
  do {
    newFood = { row: Math.floor(Math.random() * ROWS), col: Math.floor(Math.random() * COLS) };
  } while (snakeBody.some(part => part.row === newFood.row && part.col === newFood.col));
  return newFood;
};

const isCollision = (head: Position, body: Position[]): boolean =>
  head.row < 0 || head.row >= ROWS ||
  head.col < 0 || head.col >= COLS ||
  body.some(part => part.row === head.row && part.col === head.col);

const mapToPixelIndex = ({ row, col }: Position): number =>
  col % 2 === 0 ? col * ROWS + row : col * ROWS + (ROWS - 1 - row);

const sendToBoard = async (snake: Position[], food: Position) => {
  let cmd = 'l#' + snake.map(p => `P${mapToPixelIndex(p)}`).join(',') + `,E${mapToPixelIndex(food)}#`;
  try { await moonboardBLE.sendData(cmd); } catch (err) { console.warn('BLE error', err); }
};

const SnakeScreen = () => {
  const [snake, setSnake] = useState<Position[]>([
    { row: 0, col: 2 },
    { row: 0, col: 1 },
    { row: 0, col: 0 }
  ]);
  const [food, setFood] = useState<Position>(generateFood(snake));
  const foodRef = useRef<Position>(food);
  const [direction, setDirection] = useState<Direction>('right');
  const directionRef = useRef<Direction>('right');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState<number>(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    startCountdown();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startCountdown = () => {
    setShowPrompt(false);
    let count = 3;
    setCountdown(count);
    setShowCountdown(true);
    const id: NodeJS.Timeout = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(id);
        setShowCountdown(false);
        startGame();
      }
    }, 1000);
  };

  const startGame = () => {
    const initialSnake: Position[] = [
      { row: 0, col: 2 },
      { row: 0, col: 1 },
      { row: 0, col: 0 }
    ];
    const firstFood = generateFood(initialSnake);
    setSnake(initialSnake);
    setFood(firstFood);
    foodRef.current = firstFood;
    setGameOver(false);
    setWin(false);
    setScore(0);
    directionRef.current = 'right';
    setDirection('right');
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSnake(prev => {
        const [dRow, dCol] = directions[directionRef.current];
        const newHead: Position = { row: prev[0].row + dRow, col: prev[0].col + dCol };
        if (isCollision(newHead, prev)) {
          clearInterval(intervalRef.current!);
          setGameOver(true);
          setShowPrompt(true);
          return prev;
        }
        const didEat = newHead.row === foodRef.current.row && newHead.col === foodRef.current.col;
        const newSnake = didEat ? [newHead, ...prev] : [newHead, ...prev.slice(0, -1)];
        if (didEat) {
          const newLength = newSnake.length;
          setScore(score => score + 1);
          if (newLength === ROWS * COLS) {
            clearInterval(intervalRef.current!);
            setWin(true);
            setShowPrompt(true);
            return newSnake;
          } else {
            const nextFood = generateFood(newSnake);
            setFood(nextFood);
            foodRef.current = nextFood;
          }
        }
        sendToBoard(newSnake, foodRef.current);
        return newSnake;
      });
    }, BASE_SPEED + ConfigService.delay);
  };

  const changeDirection = (newDir: Direction) => {
    const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (newDir !== directionRef.current && newDir !== opposite[directionRef.current]) {
      directionRef.current = newDir;
      setDirection(newDir);
    }
  };

  const ArrowButton = ({ icon, onPress }: { icon: string, onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
      <Icon name={icon} size={36} color="#f0f0f0" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {showCountdown && <View style={styles.countdownOverlay}><Text style={styles.countdown}>{countdown}</Text></View>}
      {showPrompt && (
        <Modal transparent>
          <View style={styles.overlay}>
            <Text style={styles.prompt}>{win ? '🎉 You Win!' : '💀 Game Over'}</Text>
            <Text style={styles.scoreText}>{`Score: ${score}`}</Text>
            <TouchableOpacity onPress={startCountdown} style={styles.restartButton}>
              <Text style={styles.restartText}>Restart</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
      <View style={styles.padContainer}>
        <View style={styles.padRow}><ArrowButton icon="chevron-up" onPress={() => changeDirection('up')} /></View>
        <View style={styles.padRow}>
          <ArrowButton icon="chevron-left" onPress={() => changeDirection('left')} />
          <View style={{ width: 30 }} />
          <ArrowButton icon="chevron-right" onPress={() => changeDirection('right')} />
        </View>
        <View style={styles.padRow}><ArrowButton icon="chevron-down" onPress={() => changeDirection('down')} /></View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117', justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  countdownOverlay: { position: 'absolute', top: 80, alignSelf: 'center' },
  countdown: { fontSize: 100, color: '#00FFAA', fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
  prompt: { fontSize: 42, color: '#ffffff', fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  scoreText: { fontSize: 26, color: '#ccc', marginBottom: 30 },
  restartButton: { backgroundColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 50, borderRadius: 14, borderWidth: 2, borderColor: '#00FFAA', shadowColor: '#00FFAA', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  restartText: { fontSize: 22, color: '#00FFAA', fontWeight: 'bold' },
  padContainer: { alignItems: 'center', marginTop: 60 },
  padRow: { flexDirection: 'row', marginVertical: 10 },
  key: { backgroundColor: '#1e1e2e', paddingVertical: 32, paddingHorizontal: 40, borderRadius: 12, borderWidth: 1, borderColor: '#444', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 8, minWidth: width * 0.25, alignItems: 'center' },
  keyPressed: { backgroundColor: '#2a2a3e' }
});

export default SnakeScreen;
