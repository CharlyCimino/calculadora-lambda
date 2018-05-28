
OLCE = { /*Online  Lambda  Calculus  Evaluator*/
    /*global application settings*/
    Settings : {
        strategy          : EvaluationStrategy.FULL_BETA,
        discipline        : TypeDiscipline.UNTYPED,
        dropParens        : true,
        expandMacros      : true,
        preferConstants   : true,
        lockStrategy      : false,
        evalLimit         : 50,
    },

    /*derivation data and environment*/
    Data : {
        aliases    : new Environment(),
        constants  : [],
        derivation : new Derivation(),
    },

    /* redraws derivation tree, 'fullRefresh' redraws whole tree, 
       otherwise optimized version will occur, where only the bottom of
       the derivation chain is changed */
    refreshTree(fullRefresh = true) {
        if (fullRefresh) {
            OLCE.DOM.evaluationFrame.innerHTML = OLCE.Data.derivation.toHtml();
        } else {
            var n = OLCE.Data.derivation.getNumberOfLines();
            var d = OLCE.Data.derivation.getLineByNumber(n - 2);
            OLCE.DOM.removeLastNode();
            OLCE.DOM.evaluationFrame.insertAdjacentHTML('beforeend', d.toHtml(n - 2));
        }
    },

    /*sets the URL to point to the current term*/
    refreshURL() {
        if (OLCE.Data.derivation.getLast().term == null) {
            return;
        }
        const stateBefore = OLCE.Settings.dropParens;
        OLCE.Settings.dropParens = false;
        location.hash = encodeURI(
            TypeDiscipline.toName(OLCE.Settings.discipline) +
            OLCE.Data.derivation.getLast().term.toDisplay()
        );
        OLCE.Settings.dropParens = stateBefore;
    },

    /*sets a new term for evaluation*/
    reset(term = OLCE.Data.derivation.term) {
        OLCE.Data.derivation = new Derivation(term);
        OLCE.refresh();
    },

    /*refreshes screen. 'count' argument is a number of evaluation steps taken
      if 'fullRefresh' is true, whole derivation tree will be redrawn, otherwise,
      only the last element will be appended */
    refresh(count = 0, fullRefresh = true) {
        OLCE.refreshURL();
        OLCE.refreshTree(fullRefresh);
        OLCE.refreshBottomPanel(count);
        OLCE.refreshTopPanel();
        OLCE.DOM.preferAliasFrame.innerHTML =
            OLCE.Settings.preferConstants ? "yes" : "no";
        if (OLCE.Settings.expandMacros) {
            OLCE.UI.appearAliases(OLCE.DOM.evaluationFrame, true);
        } else {
            OLCE.UI.appearAliases(OLCE.DOM.evaluationFrame, false);
        }
    },

    /*refreshes bottom panel, 'count' argument is a number of eval. steps taken*/
    refreshBottomPanel(count = 0) {
        OLCE.DOM.infoFrame.innerHTML = count > 0 ?
            "<em>" + count + " steps later</em>—" + Evaluator.info() : Evaluator.info();
        OLCE.DOM.disciplineFrame.innerHTML = OLCE.Settings.discipline;
    },

    /*refreshes top panel for menu selection*/
    refreshTopPanel() {
        OLCE.DOM.strategyFrame.innerHTML = OLCE.Settings.strategy;
        OLCE.DOM.shorthandFrame.innerText = OLCE.Settings.dropParens ? 'yes' : 'no';
        OLCE.DOM.macroFrame.innerText = OLCE.Settings.expandMacros ? 'yes' : 'no';
    },

    /*appends a new reduced term to a given node*/
    reduceInDerivation(redex, current = OLCE.Data.derivation.getLast()) {
        var rArrow = { arrow : Arrow.BETA };
        if (Evaluator.isRedex.byStrategy(redex, current.term)) {
            var newTerm = applyBetaDelta(current.term, redex, rArrow);
            current.addChildTerm(newTerm, rArrow.arrow);
        }
    },

    /*user interface calls, triggered by mouse/keyboard events*/
    UI : {
        /*parses user input and enters main screen*/
        submit() {
            var string = document.getElementById('parserInputBox').value;
            if (Parser.parse(string)) {
                OLCE.reset(Parser.parse(string));
                OLCE.refreshURL();
                OLCE.DOM.initialScreen.style.display = 'none';
                OLCE.DOM.mainScreen.style.display = 'block';
            }
        },

        /*submits on enter key*/
        submitOnEnter(keyEvent) {
            if (keyEvent && keyEvent.keyCode == '13') {
                OLCE.UI.submit();
            }
        },

        /*displays import/export dialog box*/
        showIo() {
            OLCE.UI.cancelAliasClick();
            OLCE.DOM.settingsMenu.style.display = 'none';
            OLCE.DOM.inputOutputWindow.style.display = 'block';
        },

        /*sets reduction strategy*/
        setStrategy(str) {
            OLCE.Settings.strategy = EvaluationStrategy[str];
            OLCE.DOM.strategyMenu.style.display = 'none';
            OLCE.refresh();
        },

        /*displays the 'options' menu*/
        optionClick() {
            OLCE.DOM.strategyMenu.style.display = 'none';
            if (OLCE.DOM.settingsMenu.style.display == 'none') {
                OLCE.DOM.settingsMenu.style.display = 'block';
            } else {
                OLCE.DOM.settingsMenu.style.display = 'none';
            }
        },

        /*converts the last term to ski and if successful, resets*/
        skiClick() {
            var t = Evaluator.toSki(OLCE.Data.derivation.getLast().term);
            if (t) {
                OLCE.reset(t);
            }
            OLCE.DOM.settingsMenu.style.display = 'none';
        },

        /*sets type system, triggered by initial screen click*/
        disciplineClick(typeSystemName) {
            if (TypeDiscipline[typeSystemName]) {
                OLCE.Settings.discipline = TypeDiscipline[typeSystemName];
            }

            if (OLCE.Settings.discipline != TypeDiscipline.UNTYPED) {
                OLCE.Settings.strategy = EvaluationStrategy.CALL_BY_VALUE;
                OLCE.Settings.lockStrategy = true;
            } else {
                OLCE.Settings.strategy = EvaluationStrategy.FULL_BETA;
                OLCE.Settings.lockStrategy = false;
            }

            if (OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
                OLCE.DOM.howToEnterArrow.style.display = 'block';
            } else {
                OLCE.DOM.howToEnterArrow.style.display = 'none';
            }

            var untypedTag = document.getElementById('untypedTag');
            var simplyTag  = document.getElementById('simplyTag');
            var hindleyTag = document.getElementById('hindleyTag');

            untypedTag.style.boxShadow = 'none';
            simplyTag.style.boxShadow  = 'none';
            hindleyTag.style.boxShadow = 'none';

            var tag;
            switch (typeSystemName) {
            case 'UNTYPED':        tag = untypedTag; break;
            case 'SIMPLY_TYPED':   tag = simplyTag;  break;
            case 'HINDLEY_MILNER': tag = hindleyTag; break;
            }
            tag.style.boxShadow = 'inset 0px 0px 0px white, inset 0px -6px 0px #bcc3d0'
            var inputBox = document.getElementById('parserInputBox');
            OLCE.UI.slashToLambdaWelcome(inputBox);
            inputBox.focus();
        },

        /*shows system print dialog*/
        print() {
            OLCE.UI.cancelAliasClick();
            window.print();
        },

        /*hides import/export, and alias addition windows*/
        cancelAliasClick() {
            OLCE.DOM.aliasTermInput.value = '';
            OLCE.DOM.aliasNameInputBox.value = '';
            OLCE.DOM.aliasWindow.style.display = 'none';
            OLCE.DOM.inputOutputWindow.style.display = 'none';
        },

        /*toggles bin. setting, string setting name arg., triggered by shorthand, alias exp. click*/
        toggleSetting(s) {
            OLCE.Settings[s] = OLCE.Settings[s] ? false : true;
            OLCE.DOM.settingsMenu.style.display = 'none';
            OLCE.DOM.strategyMenu.style.display = 'none';
            OLCE.refresh();
        },

        /*saves derivation into file*/
        saveFile() {
            OLCE.Data.derivation.toFile();
            OLCE.UI.cancelAliasClick();
        },

        /*outputs latex source on a new page*/
        outputLatex() {
            OLCE.UI.cancelAliasClick();
            Derivation.generatePage(OLCE.Data.derivation.toLatex());
        },

        /*displays strategy selection menu, triggered by 'reduction strategy' click*/
        strategyClick() {
            OLCE.DOM.settingsMenu.style.display = 'none';
            if (OLCE.Settings.lockStrategy) {
                OLCE.DOM.strategyFrame.innerHTML = OLCE.Settings.strategy + " (locked)";
                return;
            }
            if (OLCE.DOM.strategyMenu.style.display == 'none') {
                OLCE.DOM.strategyMenu.style.display = 'block';
            } else {
                OLCE.DOM.strategyMenu.style.display = 'none';
            }
        },

        /*accepts a new user-defined alias, triggered by click on the 'accept' button*/
        acceptNewAlias() {
            if (OLCE.UI.sanitizeAliasName() && OLCE.UI.slashToLambdaAlias(OLCE.DOM.aliasTermInput)) {
                OLCE.Data.aliases.addAlias(OLCE.DOM.aliasNameInputBox.value,
                       Parser.parse(OLCE.DOM.aliasTermInput.value), true,
                       OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED);
                OLCE.UI.cancelAliasClick();
                OLCE.refresh();
            }
        },

        /*creates or hides an outline on mouse hover 'current' is DOM object*/
        highlight(current, add = true) {
            while (current.className !== null && current.className != 'termContainer') {
                if (current.className === 'redex') {
                    var c = current.children;
                    for (var i = 0; i < c.length; i++) {
                        if (add) {
                            if (c[i].className === 'redA') {
                                c[i].className = 'termRedexA'; 
                            } 
                            if (c[i].className === 'redB') {
                                c[i].className = 'termRedexB'; 
                            }
                        } else {
                            if (c[i].className === 'termRedexA') {
                                c[i].className = 'redA'; 
                            } 
                            if (c[i].className === 'termRedexB') {
                                c[i].className = 'redB'; 
                            }
                        }
                    }
                    return;
                }
                if (add && current.className === 'deltaRedex') {
                    current.className = 'termDeltaRedex';
                    return;
                } else if (!add && current.className === 'termDeltaRedex') {
                    current.className = 'deltaRedex';
                    return;
                }
                if (!add && current.className === 'termLet') {
                    current.className = 'termLetRedex';
                    return;
                } else if (add && current.className === 'termLetRedex') {
                    current.className = 'termLet';
                    return;
                }
                current = current.parentElement;
            }
        },

        /*click on the star-arrow: evaluates term immediately*/
        evaluateAtOnce() {
            var repeat = true;
            var c = 0;
            var lastDerivation = OLCE.Data.derivation.getLast();
            var original = { tree: OLCE.Data.derivation, last: lastDerivation };
            var counter  = { count: 0 };
            while (repeat) {
                c++;
                var redex = Evaluator.getRedex.byStrategy(lastDerivation.term);
                if (redex) {
                    OLCE.reduceInDerivation(redex, lastDerivation);
                    if (lastDerivation.term.equals(lastDerivation.childDerivation.term)) {
                        repeat = false;
                    }
                    lastDerivation = lastDerivation.childDerivation;
                } else {
                    repeat = false;
                }

                if (c > OLCE.Settings.evalLimit) {
                    OLCE.Data.derivation = original.tree;
                    var currentNode = original.last;
                    currentNode.addChildTerm(
                        Evaluator.getNormalForm(currentNode.term, counter));
                    currentNode = currentNode.childDerivation;
                    currentNode.arrow = Arrow.STAR;
                    repeat = false;
                }
            }
            OLCE.refresh(counter.count);
        },

        /*new/modify term click: returns on the initial screen*/
        backToInitialScreen() {
            OLCE.UI.cancelAliasClick();
            location.hash = "";
            OLCE.DOM.mainScreen.style.display = 'none';
            OLCE.DOM.initialScreen.style.display = 'block';
            const box = OLCE.DOM.userInputBox;
            OLCE.UI.disciplineClick(TypeDiscipline.toName(OLCE.Settings.discipline));
            if (box.value.length == 0) {
                box.value = OLCE.Data.derivation.term.toDisplay();
            }
            box.focus();
            box.selectionStart = 0;
            box.selectionEnd = box.value.length;
        },

        /*import derivation and aliases from a file click*/
        importDerivationFile() {
            var fr = new FileReader();
            var file = document.getElementById('fileInputBox').files[0];
            fr.onload = function(e) {
                var text = e.target.result;
                var derivation = Derivation.textToDerivation(text);
                if (derivation && derivation.terms > 0) {
                    OLCE.Settings.discipline =
                        TypeDiscipline[derivation.discipline];
                    var currentNode = OLCE.Data.derivation = derivation.derivation;
                    while (currentNode.childDerivation) {
                        currentNode = currentNode.childDerivation;
                    }
                    OLCE.refresh();
                    OLCE.DOM.infoFrame.innerHTML = "<em>" + derivation.terms +
                    " term" + (derivation.terms > 1 ? "s" : "")
                    + " loaded</em>—" + OLCE.DOM.infoFrame.innerHTML;
                }
                OLCE.DOM.initialScreen.style.display = 'none';
                OLCE.DOM.mainScreen.style.display = 'block';
            };
            fr.readAsText(file);
            OLCE.UI.cancelAliasClick();
        },

        /*import only aliases from a file*/
        importAliasesFile() {
            var fr = new FileReader();
            var file = document.getElementById('fileInputBoxAliases').files[0];
            fr.onload = function(e) {
                var text = e.target.result;
                var derivation = Derivation.textToDerivation(text);
                if (derivation) {
                    OLCE.refresh();
                    document.getElementById('importAliasesButton').innerHTML =
                        'IMPORT ALIASES FROM A FILE (' + derivation.aliases + ' LOADED)';
                    OLCE.DOM.infoFrame.innerHTML = "<em>" + derivation.aliases +
                    " alias" + (derivation.terms > 1 ? "es" : "")
                    + " loaded</em>—" + OLCE.DOM.infoFrame.innerHTML;

                }
            };
            fr.readAsText(file);
            OLCE.UI.cancelAliasClick();
        },

        /* fill in the current term into alias addition box */
        aliasUseCurrent() {
            var state = OLCE.Settings.dropParens;
            OLCE.Settings.dropParens = false;
            OLCE.DOM.aliasTermInput.value = OLCE.Data.derivation
                                                .getLast().term.toDisplay();
            OLCE.Settings.dropParens = state;
            OLCE.UI.slashToLambdaAlias(OLCE.DOM.aliasTermInput);
        },

        /* displays alias addition dialog box */
        aliasAddition() {
            OLCE.UI.cancelAliasClick();
            OLCE.DOM.settingsMenu.style.display = 'none';
            OLCE.DOM.aliasWindow.style.display = 'block';
            OLCE.UI.sanitizeAliasName();
            OLCE.UI.slashToLambdaAlias(OLCE.DOM.aliasTermInput);
        },

        /* reduces the clicked term. triggered by term-click,
           parameter is code of the clicked term */
        clickReduce(code) {
            var redex = OLCE.Data.derivation.codeToTerm(code, true);
            var codes = (code + "").match(/(.*)\.(.*)/);
            var rArrow = { arrow : Arrow.BETA };
            var fullRefresh = OLCE.Data.derivation.getNumberOfLines() - 1 != codes[1];
            var currentLine = OLCE.Data.derivation.getLineByNumber(codes[1]);
            var newTerm = applyBetaDelta(OLCE.Data
                                             .derivation
                                             .getLineByNumber(codes[1]).term, redex, rArrow);
            if (newTerm) {
                currentLine.addChildTerm(newTerm, rArrow.arrow);
                OLCE.refresh(0, fullRefresh);
            }
        },

        /* sanitizes the string for alias name, triggered by inputbox keystroke */
        sanitizeAliasName() {
            let inputBox = OLCE.DOM.aliasNameInputBox;
            inputBox.value = inputBox.value.toUpperCase()
                                     .replace(/[^A-Z]*/g, "");

            if (inputBox.value == "") {
                inputBox.style.borderBottomColor = "#e08888";
                return false;
            }
            if (OLCE.Data.aliases.containsName(inputBox.value)) {
                document.getElementById('aliasError').style.display = 'inline';
                inputBox.style.borderBottomColor = "#e08888";
                return false;
            } else {
                document.getElementById('aliasError').style.display = 'none';
                inputBox.style.borderBottomColor = "#8bbb8d";
            }
            return true;
        },

        /*displays aliases as terms on mouse hover, triggered by term mouse-over*/
        appearAliases(obj, show = true) {
            if (!obj || (show && !OLCE.Settings.expandMacros)) {
                return;
            }
            if (obj.className === 'hasAlias') {
                if (show) {
                    obj.style.display = 'none';
                } else {
                    obj.style.display = 'inline';
                }
            } else if (obj.className === 'isAlias') {
                if (show) {
                    obj.style.display = 'inline';
                } else {
                    obj.style.display = 'none';
                }
            }
            for (var i = 0; i < obj.children.length; i++) {
                OLCE.UI.appearAliases(obj.children[i], show);
            }
        },

		/* replaces slashes with lambdas, creates arrows, changes cursor
           position appropriatelly, returns true iff text can be parsed */
		slashToLambda(inputBox) {
		    var before = inputBox.selectionStart;
		    var withArrow = inputBox.value.replace(/->/g, "→");
		    if (withArrow != inputBox.value) {
		        inputBox.value = withArrow;
		        before--;
		    }
		    inputBox.value = inputBox.value.replace(/\\/g, "λ")
		    inputBox.selectionStart = before;
		    inputBox.selectionEnd = before;
		    return Parser.parse(inputBox.value) != null;
		},

		/* changes style of the main input box, triggered by keystroke */
		slashToLambdaWelcome(inputBox) {
		    if (OLCE.UI.slashToLambda(inputBox)) {
		        inputBox.style.outlineColor = "#8bbb8d";
		    } else {
		        inputBox.style.outlineColor = "#e08888";
		    }
		},

		/* changes style of the alias input box */
		slashToLambdaAlias(inputBox) {
		    if (OLCE.UI.slashToLambda(inputBox)) {
		        inputBox.style.borderBottomColor = "#8bbb8d";
		        return true;
		    } else {
		        inputBox.style.borderBottomColor = "#e08888"; 
		    }
		    return false;
		},

    },//UI

    /*dom element variables*/
    DOM : {
        settingsMenu      : null,
        strategyMenu      : null,
        macroFrame        : null,
        shorthandFrame    : null,
        strategyFrame     : null,
        inputOutputWindow : null,
        howToEnterArrow   : null,
        evaluationFrame   : null,
        aliasWindow       : null,
        infoFrame         : null,
        disciplineFrame   : null,
        preferAliasFrame  : null,
        mainScreen        : null,
        initialScreen     : null,
        aliasNameInputBox : null,
        aliasTermInput    : null,
        userInputBox      : null,
        /*removes last node -- the current term*/
        removeLastNode() {
            var nodes = OLCE.DOM.evaluationFrame.childNodes;
            OLCE.DOM.evaluationFrame.removeChild(nodes[nodes.length - 1]); 
        },
        /*runs on page load, associates variables with DOM objects, loads URL term*/
        prepare() {
            OLCE.DOM.evaluationFrame   = document.getElementById('evaluationFrame');
            OLCE.DOM.infoFrame         = document.getElementById('infoframe');
            OLCE.DOM.disciplineFrame   = document.getElementById('disciplineFrame');
            OLCE.DOM.strategyFrame     = document.getElementById('strategyFrame');
            OLCE.DOM.strategyMenu      = document.getElementById('strategyMenu');
            OLCE.DOM.settingsMenu      = document.getElementById('settingMenu');
            OLCE.DOM.macroFrame        = document.getElementById('macroFrame');
            OLCE.DOM.shorthandFrame    = document.getElementById('shorthandFrame');
            OLCE.DOM.aliasWindow       = document.getElementById('aliasWindow');
            OLCE.DOM.aliasNameInputBox = document.getElementById('aliasNameInput');
            OLCE.DOM.aliasTermInput    = document.getElementById('aliasTermInput');
            OLCE.DOM.inputOutputWindow = document.getElementById('inputOutputWindow');
            OLCE.DOM.preferAliasFrame  = document.getElementById('preferAliasFrame');
            OLCE.DOM.userInputBox      = document.getElementById('parserInputBox');
            OLCE.DOM.mainScreen        = document.getElementById('mainScreen');
            OLCE.DOM.initialScreen     = document.getElementById('initialScreen');
            OLCE.DOM.howToEnterArrow   = document.getElementById('stlcLead');
            OLCE.DOM.shorthandFrame.innerText   = OLCE.Settings.dropParens      ? "yes" : "no";
            OLCE.DOM.macroFrame.innerText       = OLCE.Settings.expandMacros    ? "yes" : "no";
            OLCE.DOM.preferAliasFrame.innerHTML = OLCE.Settings.preferConstants ? "yes" : "no";
            OLCE.DOM.strategyMenu.style.display = 'none';
            OLCE.DOM.settingsMenu.style.display = 'none';
            OLCE.UI.slashToLambdaAlias(OLCE.DOM.aliasTermInput);
            OLCE.UI.sanitizeAliasName();

            Constant.addConstantsAndAliases();
            OLCE.UI.disciplineClick('UNTYPED');
            OLCE.DOM.userInputBox.onkeydown = OLCE.UI.submitOnEnter;

            var r = window.location.hash.match(/#(UNTYPED|SIMPLY_TYPED|HINDLEY_MILNER)(.+)/)
            if (r) {
                OLCE.Settings.discipline = TypeDiscipline[r[1]];
                if (OLCE.Settings.discipline != TypeDiscipline.UNTYPED) {
                    OLCE.Settings.strategy = EvaluationStrategy.CALL_BY_VALUE;
                    OLCE.Settings.lockStrategy = true;
                }
                var derivation = Derivation.textToDerivation("term NO " + decodeURI(r[2]));
                if (derivation && derivation.terms == 1) {
                    OLCE.Data.derivation = derivation.derivation;
                    OLCE.DOM.mainScreen.style.display = 'block';
                    OLCE.DOM.initialScreen.style.display = 'none';
                    OLCE.refresh();
                }
            }
        },//prepare()
    },//DOM
};//OLCE

