"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Music } from "lucide-react"

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: "cyan-500" },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "blue-500",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "orange-500",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "yellow-500",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "green-500",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "purple-500",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "red-500",
  },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_TIME = 800
const SPEED_INCREASE_FACTOR = 0.95

const createEmptyBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

const randomTetromino = () => {
  const keys = Object.keys(TETROMINOS)
  const randKey = keys[Math.floor(Math.random() * keys.length)]
  return TETROMINOS[randKey]
}

export default function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)
  const [level, setLevel] = useState(1)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [completedRows, setCompletedRows] = useState([])
  const audioRef = useRef(null)
  const dropInterval = useRef(null)

  const checkCollision = (x, y, shape) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const newX = x + col
          const newY = y + row
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || (newY >= 0 && board[newY][newX] !== 0)) {
            return true
          }
        }
      }
    }
    return false
  }

  const isValidMove = (x, y, shape) => !checkCollision(x, y, shape)

  const moveLeft = useCallback(() => {
    if (currentPiece && isValidMove(currentPiece.x - 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, x: prev.x - 1 }))
    }
  }, [currentPiece, board])

  const moveRight = useCallback(() => {
    if (currentPiece && isValidMove(currentPiece.x + 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, x: prev.x + 1 }))
    }
  }, [currentPiece, board])

  const moveDown = useCallback(() => {
    if (!currentPiece) return
    if (isValidMove(currentPiece.x, currentPiece.y + 1, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, y: prev.y + 1 }))
    } else {
      placePiece()
    }
  }, [currentPiece, board])

  const rotate = useCallback(() => {
    if (!currentPiece) return
    const rotated = currentPiece.tetromino.shape[0].map((_, i) =>
      currentPiece.tetromino.shape.map((row) => row[i]).reverse(),
    )
    let newX = currentPiece.x
    let newY = currentPiece.y

    // Try to rotate, if not possible, try to adjust position
    if (!isValidMove(newX, newY, rotated)) {
      // Try to move left
      if (isValidMove(newX - 1, newY, rotated)) {
        newX -= 1
      }
      // Try to move right
      else if (isValidMove(newX + 1, newY, rotated)) {
        newX += 1
      }
      // Try to move up
      else if (isValidMove(newX, newY - 1, rotated)) {
        newY -= 1
      }
      // If still not possible, don't rotate
      else {
        return
      }
    }

    setCurrentPiece((prev) => ({
      ...prev,
      x: newX,
      y: newY,
      tetromino: { ...prev.tetromino, shape: rotated },
    }))

    // Continue falling after rotation
    if (isValidMove(newX, newY + 1, rotated) && newY + 1 < BOARD_HEIGHT) {
      setCurrentPiece((prev) => ({ ...prev, y: prev.y + 1 }))
    }
  }, [currentPiece, board])

  const placePiece = useCallback(() => {
    if (!currentPiece) return
    const newBoard = board.map((row) => [...row])
    currentPiece.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = y + currentPiece.y
          const boardX = x + currentPiece.x
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentPiece.tetromino.color
          }
        }
      })
    })
    setBoard(newBoard)
    clearLines(newBoard)
    spawnNewPiece()
  }, [currentPiece, board])

  const clearLines = useCallback(
    (newBoard) => {
      const linesCleared = []
      const updatedBoard = newBoard.filter((row, index) => {
        if (row.every((cell) => cell !== 0)) {
          linesCleared.push(index)
          return false
        }
        return true
      })

      if (linesCleared.length > 0) {
        setCompletedRows(linesCleared)
        setTimeout(() => {
          while (updatedBoard.length < BOARD_HEIGHT) {
            updatedBoard.unshift(Array(BOARD_WIDTH).fill(0))
          }
          setBoard(updatedBoard)
          setCompletedRows([])

          const newScore = score + linesCleared.length * 100
          setScore(newScore)

          if (Math.floor(newScore / 500) > level - 1) {
            setLevel((prev) => prev + 1)
            setDropTime((prev) => prev * SPEED_INCREASE_FACTOR)
          }
        }, 500)
      }
    },
    [score, level],
  )

  const spawnNewPiece = useCallback(() => {
    const newPiece = {
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      tetromino: randomTetromino(),
    }
    if (checkCollision(newPiece.x, newPiece.y, newPiece.tetromino.shape)) {
      setGameOver(true)
    } else {
      setCurrentPiece(newPiece)
    }
  }, [board])

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      spawnNewPiece()
    }
  }, [currentPiece, gameOver, spawnNewPiece])

  useEffect(() => {
    if (!gameOver) {
      dropInterval.current = setInterval(moveDown, dropTime)
    }
    return () => clearInterval(dropInterval.current)
  }, [moveDown, gameOver, dropTime])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver) return
      switch (e.key) {
        case "ArrowLeft":
          moveLeft()
          break
        case "ArrowRight":
          moveRight()
          break
        case "ArrowDown":
          moveDown()
          break
        case "ArrowUp":
          rotate()
          break
        default:
          break
      }
    }
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [moveLeft, moveRight, moveDown, rotate, gameOver])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5
      audioRef.current.loop = true
      if (!gameOver && isMusicPlaying) {
        audioRef.current.play().catch((error) => console.error("Audio playback failed:", error))
      } else {
        audioRef.current.pause()
      }
    }
  }, [gameOver, isMusicPlaying])

  const resetGame = () => {
    setBoard(createEmptyBoard())
    setCurrentPiece(null)
    setScore(0)
    setGameOver(false)
    setDropTime(INITIAL_DROP_TIME)
    setLevel(1)
    setCompletedRows([])
    clearInterval(dropInterval.current)
  }

  const renderCell = (x, y) => {
    if (
      currentPiece &&
      currentPiece.tetromino.shape[y - currentPiece.y] &&
      currentPiece.tetromino.shape[y - currentPiece.y][x - currentPiece.x]
    ) {
      return currentPiece.tetromino.color
    }
    return board[y][x]
  }

  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        {/* Game Board Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur-xl opacity-30"></div>
          <div className="relative bg-gray-900/90 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 shadow-2xl">
            <div className="mb-4 text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                TETRIS
              </h1>
            </div>

            <div
              className="grid bg-gray-800 rounded-lg border-2 border-gray-600 shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                width: `${BOARD_WIDTH * 24}px`,
                height: `${BOARD_HEIGHT * 24}px`,
                gap: "1px",
                padding: "4px",
              }}
            >
              {board.map((row, y) =>
                row.map((_, x) => (
                  <AnimatePresence key={`${y}-${x}`}>
                    <motion.div
                      initial={false}
                      animate={{
                        opacity: completedRows.includes(y) ? 0 : 1,
                        scale: completedRows.includes(y) ? 1.2 : 1,
                        rotateZ: completedRows.includes(y) ? 180 : 0,
                      }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className={`w-5 h-5 rounded-sm ${
                        renderCell(x, y) ? `bg-${renderCell(x, y)} shadow-lg border border-white/20` : "bg-gray-700/50"
                      }`}
                    />
                  </AnimatePresence>
                )),
              )}
            </div>
          </div>
        </div>

        {/* Game Info Panel */}
        <div className="flex flex-col gap-4">
          {/* Score Panel */}
          <div className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl min-w-[200px]">
            <div className="text-center space-y-4">
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Score</div>
                <div className="text-3xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Level</div>
                <div className="text-2xl font-bold text-purple-400">{level}</div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl">
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-300 uppercase tracking-wide mb-3">Controls</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>← → Move</div>
                <div>↓ Drop</div>
                <div>↑ Rotate</div>
                <div>🎵 Music</div>
              </div>
            </div>
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-900/90 backdrop-blur-sm p-6 rounded-xl border border-red-700 shadow-xl text-center"
            >
              <div className="text-2xl font-bold text-red-400 mb-2">Game Over!</div>
              <div className="text-sm text-gray-300">Final Score: {score.toLocaleString()}</div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={resetGame}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {gameOver ? "🎮 Play Again" : "🔄 Reset Game"}
            </Button>
            <Button
              onClick={toggleMusic}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              <Music className="w-4 h-4 mr-2" />
              {isMusicPlaying ? "🔇 Stop Music" : "🎵 Play Music"}
            </Button>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tetris-kxnh5j7hpNEcFspAndlU2huV5n6dvk.mp3"
      />
    </div>
  )
}
