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
      id: "q1",
      text: "Pregunta — Valor propio",
      latex:
        "A = \\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix}\\\\\\text{¿Cuál es un valor propio?}",
      options: ["2", "5", "−1", "4"],
      correct: "2",
      latexOptions: false,
      procedure:
        "Los valores propios se calculan con $$det(A − \\lambda I) = 0$$. Restamos $$\\lambda$$ en la diagonal: $$A − \\lambda I = \\begin{pmatrix} 2-\\lambda & 0 \\\\ 0 & 3-\\lambda \\end{pmatrix}$$. El determinante es $$(2−\\lambda)(3−\\lambda) = 0$$. Por lo tanto $$\\lambda = 2$$ o $$\\lambda = 3$$. Entonces <b>2</b> sí es un valor propio.",
    },
    {
      id: "q2",
      text: "Pregunta — Vector propio",
      latex:
        "A = \\begin{pmatrix} 4 & 0 \\\\ 0 & 1 \\end{pmatrix}\\\\\\text{Buscamos vector propio para } \\lambda = 4",
      options: ["(1,0)", "(0,1)", "(1,1)", "(2,1)"],
      correct: "(1,0)",
      latexOptions: false,
      procedure:
        "Un vector propio cumple $$Av = \\lambda v$$. Probamos $$v = (1,0)$$:<br>$$A(1,0) = (4,0)$$<br>$$4(1,0) = (4,0)$$<br>Coincide, entonces <b>(1,0)</b> es el vector propio correcto.",
    },
    {
      id: "q3",
      text: "Pregunta — Matriz diagonal",
      latex:
        "A = \\begin{pmatrix} 5 & 0 \\\\ 0 & 2 \\end{pmatrix}\\\\\\text{¿Qué es cierto?}",
      options: [
        "A ya es diagonal",
        "A no tiene valores propios",
        "A no se puede diagonalizar",
        "A es triangular superior",
      ],
      correct: "A ya es diagonal",
      latexOptions: false,
      procedure:
        "Una matriz es diagonal cuando todos los elementos fuera de la diagonal son 0. En esta matriz $$\\begin{pmatrix} 5 & 0 \\\\ 0 & 2 \\end{pmatrix}$$, todos los elementos fuera de la diagonal principal son 0. Por lo tanto <b>A ya es diagonal</b>.",
    },
    {
      id: "q4",
      text: "Pregunta — Valores propios",
      latex:
        "A = \\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}\\\\\\text{¿Cuáles son los valores propios?}",
      options: ["3 y −1", "1 y 2", "0 y 3", "2 y 2"],
      correct: "3 y −1",
      latexOptions: false,
      procedure:
        "Calculamos $$det(A − \\lambda I)$$:<br>$$A − \\lambda I = \\begin{pmatrix} 1-\\lambda & 2 \\\\ 2 & 1-\\lambda \\end{pmatrix}$$<br>$$det = (1−\\lambda)^2 − 4 = \\lambda^2 − 2\\lambda − 3 = (\\lambda−3)(\\lambda+1) = 0$$<br>Por lo tanto $$\\lambda = 3$$ y $$\\lambda = −1$$",
    },
    {
      id: "q5",
      text: "Pregunta — Vector propio",
      latex:
        "A = \\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}\\\\\\text{Vector propio para } \\lambda = 3",
      options: ["(1,1)", "(1,−1)", "(2,0)", "(0,1)"],
      correct: "(1,1)",
      latexOptions: false,
      procedure:
        "Multiplicamos $$A(1,1) = (1·1 + 2·1, 2·1 + 1·1) = (3,3)$$<br>Calculamos $$3(1,1) = (3,3)$$<br>Como coincide $$Av = \\lambda v$$, entonces <b>(1,1)</b> es el vector propio.",
    },
    {
      id: "q6",
      text: "Pregunta — ¿Es diagonalizable?",
      latex:
        "A = \\begin{pmatrix} 2 & 0 \\\\ 0 & 7 \\end{pmatrix}\\\\\\text{¿Se puede diagonalizar?}",
      options: [
        "Sí, porque tiene valores propios distintos",
        "No, porque su determinante no es cero",
        "No, porque es cuadrada",
        "No, porque es diagonal",
      ],
      correct: "Sí, porque tiene valores propios distintos",
      latexOptions: false,
      procedure:
        "Los valores propios son $$\\lambda = 2$$ y $$\\lambda = 7$$. Cuando una matriz tiene valores propios distintos, entonces es diagonalizable. La respuesta es <b>Sí, porque tiene valores propios distintos</b>.",
    },
    {
      id: "q7",
      text: "Pregunta — Matriz D",
      latex:
        "\\text{Si } A = \\begin{pmatrix} 3 & 0 \\\\ 0 & 6 \\end{pmatrix} \\text{ y } A = PDP^{-1}\\\\\\text{¿Cuál es la matriz D?}",
      options: [
        "\\begin{pmatrix} 3 & 0 \\\\ 0 & 6 \\end{pmatrix}",
        "\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}",
        "\\begin{pmatrix} 0 & 3 \\\\ 6 & 0 \\end{pmatrix}",
        "\\begin{pmatrix} 6 & 0 \\\\ 0 & 3 \\end{pmatrix}",
      ],
      correct: "\\begin{pmatrix} 3 & 0 \\\\ 0 & 6 \\end{pmatrix}",
      latexOptions: true,
      procedure:
        "La matriz D contiene los valores propios en la diagonal. Los valores propios de A son 3 y 6. Por lo tanto:<br>$$D = \\begin{pmatrix} 3 & 0 \\\\ 0 & 6 \\end{pmatrix}$$",
    },
    {
      id: "q8",
      text: "Pregunta — Polinomio característico",
      latex:
        "A = \\begin{pmatrix} 2 & 1 \\\\ 0 & 2 \\end{pmatrix}\\\\\\text{¿Cuál es el polinomio característico?}",
      options: [
        "(2 − \\lambda)^{2}",
        "(1 − \\lambda)(2 − \\lambda)",
        "\\lambda^{2} − 5",
        "(2 + \\lambda)^{2}",
      ],
      correct: "(2 − \\lambda)^{2}",
      latexOptions: true,
      procedure:
        "$$A − \\lambda I = \\begin{pmatrix} 2-\\lambda & 1 \\\\ 0 & 2-\\lambda \\end{pmatrix}$$<br>$$det(A − \\lambda I) = (2−\\lambda)(2−\\lambda) − 0 = (2−\\lambda)^2$$",
    },
    {
      id: "q9",
      text: "Pregunta — ¿Es diagonalizable?",
      latex:
        "A = \\begin{pmatrix} 2 & 1 \\\\ 0 & 2 \\end{pmatrix}\\\\\\text{¿Se puede diagonalizar?}",
      options: [
        "Sí",
        "No, porque solo tiene un vector propio",
        "Sí porque es triangular",
        "No, porque es de orden 2",
      ],
      correct: "No, porque solo tiene un vector propio",
      latexOptions: false,
      procedure:
        "El valor propio es $$\\lambda = 2$$. Al resolver $$(A − 2I)v = 0$$ solo aparece un vector propio independiente. Para diagonalizar una matriz 2×2 se necesitan dos vectores propios independientes. Por eso <b>No es diagonalizable</b>.",
    },
  ];

  // Randomize exactly ONE question from the bank
  var currentQuestion =
    questionsBank[Math.floor(Math.random() * questionsBank.length)];

  // Shuffle options but keep track of correct answer
  const shuffledOptions = currentQuestion.options.sort(
    () => Math.random() - 0.5,
  );

  // Inject the question dynamically into the HTML
  dynamicContainer.innerHTML = `
    <legend id="q-legend">${currentQuestion.text}</legend>
    <div id="latex-question" class="latex-container"></div>
    <div class="options-grid" id="options-grid">
      ${shuffledOptions
        .map(
          (opt, idx) => `
        <label class="option-label">
          <input type="radio" name="answer" value="${opt}" data-index="${idx}" required>
          <span class="custom-radio"></span> 
          <span class="option-text" id="opt-${idx}">${opt}</span>
        </label>
      `,
        )
        .join("")}
    </div>
  `;

  // Renderizar LaTeX de la pregunta principal después de que el DOM esté listo
  setTimeout(() => {
    if (window.katex) {
      try {
        katex.render(
          currentQuestion.latex,
          document.getElementById("latex-question"),
          {
            throwOnError: false,
            displayMode: true,
          },
        );
      } catch (e) {
        console.error("Error rendering question LaTeX:", e);
      }

      // Renderizar opciones si contienen LaTeX
      shuffledOptions.forEach((opt, idx) => {
        const el = document.getElementById(`opt-${idx}`);
        if (el && (opt.includes("\\") || opt.includes("^"))) {
          try {
            el.innerHTML = "";
            katex.render(opt, el, {
              throwOnError: false,
              displayMode: false,
            });
          } catch (e) {
            console.log("LaTeX render error for option", idx);
          }
        }
      });
    }
  }, 100);

  // Handle Form Submission
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var selected = document.querySelector("input[name='answer']:checked");
    if (!selected) return;

    var val = selected.value;
    var isCorrect = val === currentQuestion.correct;

    var forceRestart = localStorage.getItem("pacmanForceRestart") === "true";
    if (forceRestart) {
      isCorrect = false;
      localStorage.removeItem("pacmanForceRestart");
    }

    form.hidden = true;
    result.hidden = false;

    if (isCorrect) {
      resultIcon.innerHTML = "";
      resultIcon.className = "result-icon success";
      resultTitle.textContent = "¡Respuesta Correcta!";
      resultTitle.style.color = "#00FF66";
      resultMessage.textContent =
        "¡Magistral! Tu conocimiento está intacto, tienes permiso para continuar la partida ahora mismo.";

      procedureBox.hidden = true;
      continueBtn.innerHTML =
        "Continuar Partida <i class='bx bx-space-bar'></i>";
    } else {
      resultIcon.innerHTML = "<i class='bx bx-x-circle'></i>";
      resultIcon.className = "result-icon error";
      resultTitle.textContent = "Respuesta Incorrecta";
      resultTitle.style.color = "#FF0055";
      resultMessage.textContent =
        "Has fallado. Pierdes una vida, pero puedes continuar la partida.";
      procedureBox.hidden = false;
      procedureText.innerHTML = "";

      // Crear contenedor para renderizar la opción seleccionada
      let selectedContainer = document.createElement("span");
      let correctContainer = document.createElement("span");

      // Renderizar opción seleccionada si tiene LaTeX
      if (val.includes("\\") || val.includes("^")) {
        try {
          katex.render(val, selectedContainer, {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          selectedContainer.textContent = val;
        }
      } else {
        selectedContainer.textContent = val;
      }

      // Renderizar opción correcta si tiene LaTeX
      if (
        currentQuestion.correct.includes("\\") ||
        currentQuestion.correct.includes("^")
      ) {
        try {
          katex.render(currentQuestion.correct, correctContainer, {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          correctContainer.textContent = currentQuestion.correct;
        }
      } else {
        correctContainer.textContent = currentQuestion.correct;
      }

      // Crear texto de intro
      let introDiv = document.createElement("div");
      introDiv.appendChild(document.createTextNode("Seleccionaste "));

      let selectedBold = document.createElement("b");
      selectedBold.appendChild(selectedContainer);
      introDiv.appendChild(selectedBold);

      introDiv.appendChild(
        document.createTextNode(", pero la respuesta correcta era "),
      );

      let correctBold = document.createElement("b");
      correctBold.appendChild(correctContainer);
      introDiv.appendChild(correctBold);

      introDiv.appendChild(document.createTextNode("."));
      procedureText.appendChild(introDiv);

      // Insertar salto de línea
      procedureText.appendChild(document.createElement("br"));
      procedureText.appendChild(document.createElement("br"));

      // Insertar el procedimiento
      let procDiv = document.createElement("div");
      procDiv.innerHTML = currentQuestion.procedure;
      procedureText.appendChild(procDiv);

      // Renderizar LaTeX en el procedimiento con delay
      setTimeout(() => {
        if (window.katex) {
          try {
            let html = procDiv.innerHTML;

            // Reemplazar entidades HTML
            html = html
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'");

            const regex = /\$\$([\s\S]*?)\$\$/g;
            let lastIndex = 0;
            let newHtml = "";
            let match;

            while ((match = regex.exec(html)) !== null) {
              newHtml += html.substring(lastIndex, match.index);

              let span = document.createElement("span");
              try {
                katex.render(match[1], span, {
                  displayMode: true,
                  throwOnError: false,
                  strict: false,
                });
                newHtml += span.innerHTML;
              } catch (e) {
                newHtml += match[0];
              }
              lastIndex = match.index + match[0].length;
            }
            newHtml += html.substring(lastIndex);
            procDiv.innerHTML = newHtml;
          } catch (e) {
            console.log("Error rendering procedure LaTeX:", e);
          }
        }
      }, 150);

      continueBtn.innerHTML = "Volver a Jugar <i class='bx bx-refresh'></i>";
      continueBtn.style.background = "#FF0055";
      continueBtn.style.color = "#fff";
      continueBtn.style.boxShadow = "0 10px 20px rgba(255,0,85,0.3)";
    }

    localStorage.setItem("lastAnswerCorrect", isCorrect.toString());
  });

  // Handle Navigation returning to game
  continueBtn.addEventListener("click", function () {
    var correct = localStorage.getItem("lastAnswerCorrect") === "true";

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
      window.location.href = "flappyDino.html";
      return;
    }

    if (source === "stickHero") {
      var lives = parseInt(localStorage.getItem("stickHeroLives"), 10);
      if (!Number.isFinite(lives) || lives < 0) lives = 3;

      if (!correct) {
        lives = Math.max(0, lives - 1);
        localStorage.setItem("stickHeroLives", lives);
      }

      if (lives === 0) {
        localStorage.setItem("stickHeroRestart", "true");
        localStorage.removeItem("stickHeroPaused");
      } else {
        localStorage.setItem("stickHeroPaused", "true");
      }

      window.location.href = "stickHero.html";
      return;
    }

    if (source === "coloron") {
      var lives = parseInt(localStorage.getItem("coloronLives"), 10);
      if (!Number.isFinite(lives) || lives <= 0) {
        lives = 3;
      }
      if (!correct) {
        lives = lives - 1;
        localStorage.setItem("coloronLives", lives);
      }
      if (lives <= 0) {
        localStorage.setItem("coloronRestart", "true");
        localStorage.removeItem("coloronPaused");
      } else {
        localStorage.setItem("coloronPaused", "true");
        localStorage.removeItem("coloronRestart"); // 👈 CLAVE
      }

      window.location.href = "coloron.html";
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
