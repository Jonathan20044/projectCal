(function () {
  var form = document.getElementById("question-form");
  var dynamicContainer = document.getElementById("dynamic-question-container");
  
  var result = document.getElementById("result");
  var resultIcon = document.getElementById("result-icon");
  var resultTitle = document.getElementById("result-title");
  var resultMessage = document.getElementById("result-message");
  var procedureBox = document.getElementById("procedure-box");
  var procedureText = document.getElementById("procedure-text");
  var continueBtn = document.getElementById("continue-btn");
  
  var params = new URLSearchParams(window.location.search);
  var source = params.get("source");

  if (!form) return;

  const questionsBank = [
    {
      id: 'q1',
      text: "¿Cuánto es 8 + 5?",
      options: ["10", "12", "13", "15"],
      correct: "13",
      procedure: "Para calcular esto rápidamente, puedes descomponer el 5. Piensa en cuánto le falta al 8 para llegar a 10 (le faltan 2). Entonces restas 2 al 5 y te quedan 3. Al final sumas 10 + 3 = <b>13</b>."
    },
    {
      id: 'q2',
      text: "¿Cuánto es 12 - 7?",
      options: ["3", "5", "7", "9"],
      correct: "5",
      procedure: "Descompón el 7. Primero réstale 2 al 12 para llegar cómodamente a 10 (12 - 2 = 10). Como querías restar 7 y solo has restado 2, aún te faltan restar 5. Entonces haces 10 - 5 = <b>5</b>."
    },
    {
      id: 'q3',
      text: "¿Cuánto es 6 x 3?",
      options: ["12", "15", "18", "21"],
      correct: "18",
      procedure: "La multiplicación no es más que sumar el mismo número varias veces. 6 x 3 significa sumar el 6 tres veces seguidas: 6 + 6 = 12, y al añadir el tercer 6 obtenemos 12 + 6 = <b>18</b>."
    },
    {
      id: 'q4',
      text: "¿Cuánto es 20 / 4?",
      options: ["4", "5", "6", "8"],
      correct: "5",
      procedure: "Dividir 20 entre 4 es lo mismo que preguntarse: ¿Qué número multiplicado por 4 da exactamente 20? Al revisar las tablas iterando: 4x3=12, 4x4=16, 4x5=20. Por lo tanto, 20 / 4 = <b>5</b>."
    }
  ];

  // Randomize exactly ONE question from the bank
  var currentQuestion = questionsBank[Math.floor(Math.random() * questionsBank.length)];

  // Inject the question dynamically into the HTML
  dynamicContainer.innerHTML = `
    <legend id="q-legend">${currentQuestion.text}</legend>
    <div class="options-grid">
      ${currentQuestion.options.map((opt) => `
        <label class="option-label">
          <input type="radio" name="answer" value="${opt}" required>
          <span class="custom-radio"></span> ${opt}
        </label>
      `).join('')}
    </div>
  `;

  // Handle Form Submission
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var selected = document.querySelector("input[name='answer']:checked");
    if (!selected) return; // shouldn't happen due to 'required' html tag

    var val = selected.value;
    var isCorrect = val === currentQuestion.correct;
    
    // If the pacman script flagged a forceRestart due to losing its own lives etc
    var forceRestart = localStorage.getItem("pacmanForceRestart") === "true";
    if (forceRestart) {
      isCorrect = false;
      localStorage.removeItem("pacmanForceRestart");
    }

    form.hidden = true; // hide the question
    result.hidden = false; // present the result screen

    if (isCorrect) {
      resultIcon.innerHTML = "";
      resultIcon.className = "result-icon success";
      resultTitle.textContent = "¡Respuesta Correcta!";
      resultTitle.style.color = "#00FF66";
      resultMessage.textContent = "¡Magistral! Tu conocimiento está intacto, tienes permiso para continuar la partida ahora mismo.";
      
      procedureBox.hidden = true;
      continueBtn.innerHTML = "Continuar Partida <i class='bx bx-space-bar'></i>";
      
    } else {
      resultIcon.innerHTML = "<i class='bx bx-x-circle'></i>";
      resultIcon.className = "result-icon error";
      resultTitle.textContent = "Respuesta Incorrecta";
      resultTitle.style.color = "#FF0055";
      resultMessage.textContent = "Has fallado. Tu error tiene consecuencias, por lo que tendrás que reiniciar tu juego desde cero.";
      
      // Inject Procedure specific to that incorrect question
      procedureBox.hidden = false;
      procedureText.innerHTML = `Seleccionaste el número <b>${val}</b>, pero la respuesta correcta indiscutible era <b>${currentQuestion.correct}</b>.<br><br>${currentQuestion.procedure}`;
      
      // Change continue button to Restart Style (Red)
      continueBtn.innerHTML = "Volver a Jugar <i class='bx bx-refresh'></i>";
      continueBtn.style.background = "#FF0055";
      continueBtn.style.color = "#fff";
      continueBtn.style.boxShadow = "0 10px 20px rgba(255,0,85,0.3)";
    }
    
    // Storing correctness state to be queried correctly on next window navigation state
    localStorage.setItem('lastAnswerCorrect', isCorrect.toString());
  });

  // Handle Navigation returning to game
  continueBtn.addEventListener("click", function () {
    var correct = localStorage.getItem('lastAnswerCorrect') === 'true';

    if (source === "pacman") {
      if (correct) {
        localStorage.setItem("pacmanResumeOk", "true");
      } else {
        localStorage.removeItem("pacmanResume");
        localStorage.setItem("pacmanRestart", "true");
      }
      window.location.href = "pacman.html";
      return;
    }

    if (source === "flappy") {
      if (correct) {
        localStorage.setItem("flappyResumeOk", "true");
      } else {
        localStorage.removeItem("flappyResume");
        localStorage.setItem("flappyRestart", "true");
      }
      window.location.href = "flappy.html";
      return;
    }

    if (source === "stickHero") {
      if (correct) {
        localStorage.setItem("stickHeroResumeOk", "true");
      } else {
        localStorage.removeItem("stickHeroResume");
        localStorage.setItem("stickHeroRestart", "true");
      }
      window.location.href = "stickHero.html";
      return;
    }

    if (source === "snake") {
      if (correct) {
        localStorage.setItem("snakeResumeOk", "true");
      } else {
        localStorage.removeItem("snakeResume");
        localStorage.setItem("snakeRestart", "true");
      }
      window.location.href = "snake.html";
      return;
    }

    if (source === "meteor") {
      if (correct) {
        localStorage.setItem("meteorResumeOk", "true");
      } else {
        localStorage.removeItem("meteorResume");
        localStorage.setItem("meteorRestart", "true");
      }
      window.location.href = "meteor.html";
      return;
    }

    if (source === "neonbreaker") {
      if (correct) {
        localStorage.setItem("neonbreakerResumeOk", "true");
      } else {
        localStorage.removeItem("neonbreakerResume");
        localStorage.setItem("neonbreakerRestart", "true");
      }
      window.location.href = "neonbreaker.html";
      return;
    }

    window.location.href = "../index.html";
  });
})();
