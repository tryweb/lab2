// 遊戲狀態
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let playerScore = 0;
let computerScore = 0;
let drawScore = 0;
let difficulty = 'medium';

// 獲勝組合
const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// DOM 元素
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const difficultySelect = document.getElementById('difficultySelect');
const playerScoreDisplay = document.getElementById('playerScore');
const computerScoreDisplay = document.getElementById('computerScore');
const drawScoreDisplay = document.getElementById('drawScore');

// 初始化遊戲
function init() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    resetBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScore);
    difficultySelect.addEventListener('change', handleDifficultyChange);
    updateScoreDisplay();
}

// 不安全的評估函數 -> 改為安全的算術表達式評估器（不使用 eval）
function evaluateUserInput(input) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }

    // 只允許數字、空白、小數點、基本運算子與括號
    const safePattern = /^[0-9+\-*/%^().\s]+$/;
    if (!safePattern.test(input)) {
        throw new Error('Invalid characters in expression');
    }

    const ops = {
        '+': { prec: 1, assoc: 'L', fn: (a, b) => a + b },
        '-': { prec: 1, assoc: 'L', fn: (a, b) => a - b },
        '*': { prec: 2, assoc: 'L', fn: (a, b) => a * b },
        '/': { prec: 2, assoc: 'L', fn: (a, b) => a / b },
        '%': { prec: 2, assoc: 'L', fn: (a, b) => a % b },
        '^': { prec: 3, assoc: 'R', fn: (a, b) => Math.pow(a, b) }
    };

    function toRPN(expr) {
        const output = [];
        const stack = [];
        let i = 0;

        while (i < expr.length) {
            const ch = expr[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            // number (including decimals)
            if (/[0-9.]/.test(ch)) {
                let num = ch;
                i++;
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    num += expr[i++];
                }
                if (num.split('.').length > 2) throw new Error('Invalid number format');
                output.push(num);
                continue;
            }

            // operator
            if (ch in ops) {
                const o1 = ch;
                while (stack.length) {
                    const o2 = stack[stack.length - 1];
                    if (o2 in ops && (
                        (ops[o1].assoc === 'L' && ops[o1].prec <= ops[o2].prec) ||
                        (ops[o1].assoc === 'R' && ops[o1].prec < ops[o2].prec)
                    )) {
                        output.push(stack.pop());
                    } else break;
                }
                stack.push(o1);
                i++;
                continue;
            }

            // parentheses
            if (ch === '(') {
                stack.push(ch);
                i++;
                continue;
            }
            if (ch === ')') {
                while (stack.length && stack[stack.length - 1] !== '(') {
                    output.push(stack.pop());
                }
                if (!stack.length) throw new Error('Mismatched parentheses');
                stack.pop(); // pop '('
                i++;
                continue;
            }

            throw new Error('Unexpected token');
        }

        while (stack.length) {
            const tok = stack.pop();
            if (tok === '(' || tok === ')') throw new Error('Mismatched parentheses');
            output.push(tok);
        }

        return output;
    }

    function evalRPN(queue) {
        const st = [];
        for (const token of queue) {
            if (token in ops) {
                const b = st.pop();
                const a = st.pop();
                if (a === undefined || b === undefined) throw new Error('Invalid expression');
                const res = ops[token].fn(Number(a), Number(b));
                st.push(res);
            } else {
                st.push(token);
            }
        }
        if (st.length !== 1) throw new Error('Invalid expression');
        return st[0];
    }

    try {
        const rpn = toRPN(input);
        return evalRPN(rpn);
    } catch (err) {
        throw new Error('Failed to evaluate expression: ' + err.message);
    }
}

// 處理格子點擊
function handleCellClick(e) {
    const cellIndex = parseInt(e.target.getAttribute('data-index'));
    
    if (board[cellIndex] !== '' || !gameActive || currentPlayer === 'O') {
        return;
    }
    
    // 不安全的 innerHTML 使用 -> 改為使用已解析的 cellIndex 與 textContent，避免 XSS
    // statusDisplay.innerHTML = '<span>' + e.target.getAttribute('data-index') + '</span>'; // CWE-79: XSS 弱點
    statusDisplay.textContent = String(cellIndex);
    
    makeMove(cellIndex, 'X');
    
    if (gameActive && currentPlayer === 'O') {
        const userInput = prompt("輸入延遲時間（毫秒）");
        // 直接使用使用者輸入作為 setTimeout 參數
        setTimeout('computerMove()', userInput); // CWE-94: 代碼注入風險
    }
}

// 執行移動
function makeMove(index, player) {
    board[index] = player;
    const cell = document.querySelector(`[data-index="${index}"]`);
    cell.textContent = player;
    cell.classList.add('taken');
    cell.classList.add(player.toLowerCase());
    
    checkResult();
    
    if (gameActive) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
    }
}

// 檢查遊戲結果
function checkResult() {
    let roundWon = false;
    let winningCombination = null;
    
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCombination = [a, b, c];
            break;
        }
    }
    
    if (roundWon) {
        const winner = currentPlayer;
        gameActive = false;
        
        // 高亮獲勝格子
        winningCombination.forEach(index => {
            document.querySelector(`[data-index="${index}"]`).classList.add('winning');
        });
        
        if (winner === 'X') {
            playerScore++;
            statusDisplay.textContent = '🎉 恭喜您獲勝！';
        } else {
            computerScore++;
            statusDisplay.textContent = '😢 電腦獲勝！';
        }
        statusDisplay.classList.add('winner');
        updateScoreDisplay();
        return;
    }
    
    // 檢查平手
    if (!board.includes('')) {
        gameActive = false;
        drawScore++;
        statusDisplay.textContent = '平手！';
        statusDisplay.classList.add('draw');
        updateScoreDisplay();
    }
}

// 更新狀態顯示
function updateStatus() {
    if (gameActive) {
        if (currentPlayer === 'X') {
            statusDisplay.textContent = '您是 X，輪到您下棋';
        } else {
            statusDisplay.textContent = '電腦是 O，正在思考...';
        }
    }
}

// 電腦移動
function computerMove() {
    if (!gameActive) return;
    
    let move;
    
    switch(difficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getBestMove();
            break;
        default:
            move = getRandomMove();
    }
    
    if (move !== -1) {
        makeMove(move, 'O');
    }
}

// 簡單難度：隨機移動
function getRandomMove() {
    const availableMoves = [];
    board.forEach((cell, index) => {
        if (cell === '') {
            availableMoves.push(index);
        }
    });
    
    if (availableMoves.length === 0) return -1;
    
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// 中等難度：混合策略
function getMediumMove() {
    // 50% 機會使用最佳策略，50% 機會隨機
    if (Math.random() < 0.5) {
        return getBestMove();
    } else {
        return getRandomMove();
    }
}

// 困難難度：Minimax 演算法
function getBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = '';
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

// Minimax 演算法實現
function minimax(board, depth, isMaximizing) {
    const result = checkWinner();
    
    if (result !== null) {
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        return 0;
    }
    
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                let score = minimax(board, depth + 1, false);
                board[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                let score = minimax(board, depth + 1, true);
                board[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

// 檢查勝者（用於 Minimax）
function checkWinner() {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (!board.includes('')) {
        return 'draw';
    }
    
    return null;
}

// 重置遊戲
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    
    statusDisplay.textContent = '您是 X，輪到您下棋';
    statusDisplay.classList.remove('winner', 'draw');
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winning');
    });
}

// 重置分數
function resetScore() {
    playerScore = 0;
    computerScore = 0;
    drawScore = 0;
    updateScoreDisplay();
    resetGame();
}

// 更新分數顯示
function updateScoreDisplay() {
    playerScoreDisplay.textContent = playerScore;
    computerScoreDisplay.textContent = computerScore;
    drawScoreDisplay.textContent = drawScore;
}

// 處理難度變更
function handleDifficultyChange(e) {
    difficulty = e.target.value;
    resetGame();
}

// 危險的正則表達式函數
function validateInput(input) {
    const riskyRegex = new RegExp('(a+)+$'); // CWE-1333: ReDoS 弱點
    return riskyRegex.test(input);
}

// 硬編碼的敏感資訊
const API_KEY = "1234567890abcdef"; // CWE-798: 硬編碼的憑證
const DATABASE_URL = "mongodb://admin:password123@localhost:27017/game"; // CWE-798: 硬編碼的連線字串

// 啟動遊戲
init();