import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, RotateCcw, Play } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Flashcard } from '../../../server/src/schema';

interface FlashcardPlayerProps {
  flashcards: Flashcard[];
}

interface GameState {
  currentIndex: number;
  userAnswer: string;
  selectedOption: string;
  showResult: boolean;
  isCorrect: boolean;
  score: number;
  completed: number;
  gameStarted: boolean;
}

export function FlashcardPlayer({ flashcards }: FlashcardPlayerProps) {
  const [gameState, setGameState] = useState<GameState>({
    currentIndex: 0,
    userAnswer: '',
    selectedOption: '',
    showResult: false,
    isCorrect: false,
    score: 0,
    completed: 0,
    gameStarted: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentFlashcard = flashcards[gameState.currentIndex];
  const progress = flashcards.length > 0 ? (gameState.completed / flashcards.length) * 100 : 0;
  const accuracy = gameState.completed > 0 ? (gameState.score / gameState.completed) * 100 : 0;

  const startGame = () => {
    setGameState((prev: GameState) => ({
      ...prev,
      gameStarted: true,
      currentIndex: 0,
      score: 0,
      completed: 0,
      showResult: false,
      userAnswer: '',
      selectedOption: ''
    }));
  };

  const resetGame = () => {
    setGameState({
      currentIndex: 0,
      userAnswer: '',
      selectedOption: '',
      showResult: false,
      isCorrect: false,
      score: 0,
      completed: 0,
      gameStarted: false
    });
  };

  const handleSubmitAnswer = async () => {
    if (!currentFlashcard) return;

    let userAnswer = '';
    if (currentFlashcard.flashcard_type === 'multiple_choice') {
      userAnswer = gameState.selectedOption;
    } else if (currentFlashcard.flashcard_type === 'true_false') {
      userAnswer = gameState.selectedOption;
    } else {
      userAnswer = gameState.userAnswer.trim();
    }

    if (!userAnswer) return;

    setIsSubmitting(true);
    try {
      const result = await trpc.submitAnswer.mutate({
        flashcard_id: currentFlashcard.id,
        user_answer: userAnswer
      });

      setGameState((prev: GameState) => ({
        ...prev,
        showResult: true,
        isCorrect: result.is_correct,
        score: result.is_correct ? prev.score + 1 : prev.score,
        completed: prev.completed + 1
      }));
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (gameState.currentIndex < flashcards.length - 1) {
      setGameState((prev: GameState) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        userAnswer: '',
        selectedOption: '',
        showResult: false
      }));
    }
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !gameState.showResult && !isSubmitting) {
      handleSubmitAnswer();
    }
  }, [gameState.showResult, isSubmitting, currentFlashcard, gameState.userAnswer, gameState.selectedOption, handleSubmitAnswer]);

  useEffect(() => {
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [handleKeyPress]);

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No flashcards available</h3>
        <p className="text-gray-600">Generate some flashcards first to start practicing!</p>
      </div>
    );
  }

  if (!gameState.gameStarted) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">🎯</div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Practice?</h3>
          <p className="text-gray-600 mb-4">
            Test your knowledge with {flashcards.length} flashcards
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {flashcards.filter((f: Flashcard) => f.flashcard_type === 'true_false').length}
            </div>
            <div className="text-sm text-gray-600">True/False</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {flashcards.filter((f: Flashcard) => f.flashcard_type === 'multiple_choice').length}
            </div>
            <div className="text-sm text-gray-600">Multiple Choice</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-purple-600">
              {flashcards.filter((f: Flashcard) => f.flashcard_type === 'fill_in_blank').length}
            </div>
            <div className="text-sm text-gray-600">Fill in Blank</div>
          </Card>
        </div>

        <Button onClick={startGame} size="lg" className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Start Practice Session
        </Button>
      </div>
    );
  }

  if (gameState.completed >= flashcards.length) {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">🎉</div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h3>
          <p className="text-gray-600 mb-4">You've completed all flashcards</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-green-600">{gameState.score}</div>
            <div className="text-sm text-gray-600">Correct Answers</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-3xl font-bold text-blue-600">{accuracy.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </Card>
        </div>

        <Button onClick={resetGame} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            Question {gameState.currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm text-gray-600">
            Score: {gameState.score}/{gameState.completed}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{accuracy.toFixed(1)}% accuracy</span>
          <span>{flashcards.length - gameState.completed} remaining</span>
        </div>
      </div>

      {/* Flashcard */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="mb-2">
              {currentFlashcard.flashcard_type === 'true_false' && '✅ True/False'}
              {currentFlashcard.flashcard_type === 'multiple_choice' && '🔄 Multiple Choice'}
              {currentFlashcard.flashcard_type === 'fill_in_blank' && '✏️ Fill in the Blank'}
            </Badge>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentFlashcard.question}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Answer Input */}
          {!gameState.showResult && (
            <div className="space-y-4">
              {currentFlashcard.flashcard_type === 'multiple_choice' && currentFlashcard.options && (
                <div className="space-y-2">
                  {currentFlashcard.options.map((option: string, index: number) => (
                    <Button
                      key={index}
                      variant={gameState.selectedOption === option ? 'default' : 'outline'}
                      className="w-full justify-start text-left h-auto p-4"
                      onClick={() => setGameState((prev: GameState) => ({ ...prev, selectedOption: option }))}
                    >
                      <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {currentFlashcard.flashcard_type === 'true_false' && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={gameState.selectedOption === 'true' ? 'default' : 'outline'}
                    className="h-16 text-lg"
                    onClick={() => setGameState((prev: GameState) => ({ ...prev, selectedOption: 'true' }))}
                  >
                    ✅ True
                  </Button>
                  <Button
                    variant={gameState.selectedOption === 'false' ? 'default' : 'outline'}
                    className="h-16 text-lg"
                    onClick={() => setGameState((prev: GameState) => ({ ...prev, selectedOption: 'false' }))}
                  >
                    ❌ False
                  </Button>
                </div>
              )}

              {currentFlashcard.flashcard_type === 'fill_in_blank' && (
                <div>
                  <Input
                    placeholder="Type your answer here..."
                    value={gameState.userAnswer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGameState((prev: GameState) => ({ ...prev, userAnswer: e.target.value }))
                    }
                    className="text-lg h-16"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Press Enter to submit your answer
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Result Display */}
          {gameState.showResult && (
            <div className={`p-4 rounded-lg ${gameState.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
              <div className="flex items-center gap-2 mb-2">
                {gameState.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${gameState.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {gameState.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              
              {!gameState.isCorrect && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <strong>Correct answer:</strong> {currentFlashcard.correct_answer}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Your answer:</strong> {
                      currentFlashcard.flashcard_type === 'multiple_choice' || currentFlashcard.flashcard_type === 'true_false'
                        ? gameState.selectedOption
                        : gameState.userAnswer
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={resetGame}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            {!gameState.showResult ? (
              <Button 
                onClick={handleSubmitAnswer}
                disabled={
                  isSubmitting || 
                  (currentFlashcard.flashcard_type === 'fill_in_blank' && !gameState.userAnswer.trim()) ||
                  ((currentFlashcard.flashcard_type === 'multiple_choice' || currentFlashcard.flashcard_type === 'true_false') && !gameState.selectedOption)
                }
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {gameState.currentIndex < flashcards.length - 1 ? 'Next Question' : 'View Results'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}