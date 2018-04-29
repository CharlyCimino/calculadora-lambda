
var derivationTree = new Derivation(itefals);
var currentNode    = derivationTree;

var Global = {
    frame           : null,
    disciplineFrame : null,
    strategyFrame   : null,
    infoFrame       : null,
    macroFrame      : null,
    shorthandFrame  : null, 
    aliasFrame      : null,
    settingsMenu    : null,
    strategyMenu    : null,
    inputOutputFrame: null,
    aliasTermInput  : null,
    aliasNameInput  : null,
    preferAliasFrame: null,
    aliases         : new Environment(),
    constants       : [],
};

var Settings = {
    strategy:             EvaluationStrategy.FULL_BETA,
    discipline:           TypeDiscipline.UNTYPED,
    evalLimit:            50,
    lockStrategy:         false,
    displayTree:          true,
    dropParens:           true,
    expandMacros:         true,
    enableNumerals:       true,
    disableHighlight:     false,
    enableClickReduction: true,
    infixPrimitives:      true,
    preferConstants:      true,
};

document.onkeydown = keyboardProcess;

function clickReduce(obj) {
    if (!Settings.enableClickReduction) {
        return;
    }

    var redex = getTermByCode(currentNode.term, obj.className, true);
    reduceInDerivation(redex);
    refresh();
}

function reduceInDerivation(redex) {
    var rArrow = { arrow : Arrow.BETA };
    if (isReductionStrategyRedex(redex, currentNode.term)) {
        var newTerm = applyBetaDelta(currentNode.term, redex, rArrow);
        currentNode.addChildTerm(newTerm, rArrow.arrow);
        currentNode = currentNode.childDerivation;
        var previousState = Settings.dropParens;
        Settings.dropParens = false;
        location.hash = encodeURI(TypeDiscipline.toName(Settings.discipline) +
            currentNode.term.toDisplay());
        Settings.dropParens = previousState;
    }
}

function reset(term = derivationTree.term) {
    derivationTree = new Derivation(term);
    currentNode = derivationTree;
    refresh();
}

function refreshTree() { //x render only new child elements, not whole tree
    if (Settings.displayTree) {
        Global.frame.innerHTML = derivationTreeToHtml(derivationTree);
    } else {
        var wrap = (html) => "<div class='nodebox'>" +
            "<div class='termContainer' onmouseover='hideAliases(this)' " +
            "onmouseleave='showAliases(this)'>" + html + "</div></div>";
        Global.frame.innerHTML = wrap(currentNode.term.toHtml());
    }
}

function refresh(count = 0) {
    refreshTree();
    refreshBottomPanel(count);
    refreshTopPanel();
    Global.preferAliasFrame.innerHTML = Settings.preferConstants ? "yes" : "no";
    if (Settings.expandMacros) {
        showAliases(Global.frame);
    } else {
        hideAliases(Global.frame);
    }
}

function refreshBottomPanel(count = 0) {
    Global.infoFrame.innerHTML = count > 0 ?
        "<em>" + count + " steps later </em> — " + info() : info();
    Global.disciplineFrame.innerHTML = Settings.discipline;
}

function refreshTopPanel() {
    Global.strategyFrame.innerHTML = Settings.strategy;
    Global.shorthandFrame.innerText = Settings.dropParens ? 'yes' : 'no';
    Global.macroFrame.innerText = Settings.expandMacros ? 'yes' : 'no';
}

function highlight(obj, add = true) { //refactor, looks ugly
    if (Settings.disableHighlight) {
        return;
    }

    var current = obj;

    var a1 = add ? 'redA' : 'termRedexA';
    var a2 = add ? 'redB' : 'termRedexB';
    var a3 = add ? 'redD' : 'termDeltaRedex';

    while (current.className !== null && current.className != 'termContainer') {
        if (current.className === 'redex') {
            var c = current.children;

            for (var i = 0; i < c.length; i++) {
                if (c[i].className == a1) {
                    c[i].className = add ? 'termRedexA' : 'redA';
                }

                if (c[i].className == a2) {
                    c[i].className = add ? 'termRedexB' : 'redB';
                }
            }
            return;
        }

        if (current.className === 'deltaRedex') {
            if (add) {
                current.className = 'termDeltaRedex';
            }
            return;
        } else if (current.className === 'termDeltaRedex') {
            if (!add) {
                current.className = 'deltaRedex';
            }
            return;
        }

        if (current.className === 'termLet') {
            if (!add) {
                current.className = 'termLetRedex';
            } 
            return;
        } else if (current.className === 'termLetRedex') {
            if (add) {
                current.className = 'termLet';
            } 
            return;
        }


        current = current.parentElement;
    }
}

function showAliases(obj) {
    if (!obj || !Settings.expandMacros) {
        return;
    }

    if (obj.className === 'hasAlias') {
        obj.style.display = 'none';
        return;
    } else if (obj.className === 'isAlias') {
        obj.style.display = 'inline';
    }

    for (var i = 0; i < obj.children.length; i++) {
        showAliases(obj.children[i]);
    }
}

function hideAliases(obj) { //same as above
    if (!obj) {
        return;
    }

    if (obj.className === 'hasAlias') {
        obj.style.display = 'inline';
    } else if (obj.className === 'isAlias') {
        obj.style.display = 'none';
    }

    for (var i = 0; i < obj.children.length; i++) {
        hideAliases(obj.children[i]);
    }
}

function evaluateAtOnce() {
    var repeat = true;
    var c = 0;
    var original = { tree: derivationTree, last: currentNode };
    var counter  = { count: 0 };

    while (repeat) {
        c++;

        var redex = getReductionStrategyRedex(currentNode.term);
        if (redex) {
            reduceInDerivation(redex);
            if (currentNode.term.equals(currentNode.parentDerivation.term)) {
                repeat = false; 
            }
        } else {
            repeat = false;
        }

        if (c > Settings.evalLimit) {
            derivationTree = original.tree;
            currentNode = original.last;
            currentNode.addChildTerm(evaluateComplete(currentNode.term, counter));
            currentNode = currentNode.childDerivation;
            currentNode.arrow = Arrow.STAR;
            repeat = false;
        }
    }
    var previousState = Settings.dropParens;
    Settings.dropParens = false;
    location.hash = encodeURI(TypeDiscipline.toName(Settings.discipline) +
        currentNode.term.toDisplay());
    Settings.dropParens = previousState;
    refresh(counter.count);
}

/* function executed on page load. Associates DOM objects with variables. */
function prepare() {
    Global.frame           = document.getElementById('mainframe');
    Global.infoFrame       = document.getElementById('infoframe');
    Global.disciplineFrame = document.getElementById('disciplineFrame');
    Global.strategyFrame   = document.getElementById('strategyFrame');
    Global.strategyMenu    = document.getElementById('strategyMenu');
    Global.settingsMenu    = document.getElementById('settingMenu');
    Global.macroFrame      = document.getElementById('macroFrame');
    Global.shorthandFrame  = document.getElementById('shorthandFrame');
    Global.aliasFrame      = document.getElementById('aliasFrame');
    Global.aliasNameInput  = document.getElementById('aliasNameInput');
    Global.aliasTermInput  = document.getElementById('aliasTermInput');
    Global.inputOutputFrame= document.getElementById('inputOutputFrame');
    Global.preferAliasFrame= document.getElementById('preferAliasFrame');

    Global.strategyMenu.style.display = 'none';
    Global.settingsMenu.style.display = 'none';
    
    Global.shorthandFrame.innerText = Settings.dropParens ? 'yes' : 'no';
    Global.macroFrame.innerText = Settings.expandMacros   ? 'yes' : 'no';

    Global.preferAliasFrame.innerHTML = Settings.preferConstants ? "yes" : "no";
    slashToLambdaAlias(Global.aliasTermInput);
    sanitizeAliasName();
    addUntypedMacros();
    disciplineClick('UNTYPED');
    document.getElementById('parserInputBox').onkeydown = submitOnEnter;
    
    var r = window.location.hash.match(/#(UNTYPED|SIMPLY_TYPED|HINDLEY_MILNER)(.+)/)
    if (r) {
        Settings.preferConstants = true;
        Settings.discipline = TypeDiscipline[r[1]];
        var derivation = textToDerivation("term NO " + decodeURI(r[2]));
        if (derivation && derivation.terms == 1) {
            currentNode = derivationTree = derivation.derivation;
            document.getElementById('applicationFrame').style.display = 'block';
            document.getElementById('welcomeFrame').style.display = 'none';
            refresh();
            return;
        }
    }
    document.getElementById('applicationFrame').style.display = 'none';
}

function backToInitialScreen() {
    cancelAliasClick();
    location.hash = "";
    document.getElementById('applicationFrame').style.display = 'none';
    document.getElementById('welcomeFrame').style.display = 'block';
    var box = document.getElementById('parserInputBox');

    disciplineClick(TypeDiscipline.toName(Settings.discipline));
    box.focus();
    box.selectionStart = 0;
    box.selectionEnd = box.value.length;
}

function toggleSetting(s) {
    Settings[s] = Settings[s] ? false : true;
    Global.settingsMenu.style.display = 'none';
    Global.strategyMenu.style.display = 'none';
    refresh(); 
}

function optionClick() {
    Global.strategyMenu.style.display = 'none';
    if (Global.settingsMenu.style.display == 'none') {
        Global.settingsMenu.style.display = 'block';
    } else {
        Global.settingsMenu.style.display = 'none';
    }
}

function disciplineClick(typeSystemName) {
    if (TypeDiscipline[typeSystemName]) {
        Settings.discipline = TypeDiscipline[typeSystemName];
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
    slashToLambdaWelcome(inputBox);
    inputBox.focus();
}

function strategyClick() {
    Global.settingsMenu.style.display = 'none';
    if (Settings.lockStrategy) {
        Global.strategyFrame.innerHTML = Settings.strategy + " (locked)"; 
        return;
    }
    if (Global.strategyMenu.style.display == 'none') {
        Global.strategyMenu.style.display = 'block';
    } else {
        Global.strategyMenu.style.display = 'none';
    }
}

function sanitizeAliasName() {
    inputBox = Global.aliasNameInput;
    inputBox.value = inputBox.value.toUpperCase()
                             .replace(/[^A-Z]*/g, "");

    if (inputBox.value == "") {
        inputBox.style.borderBottomColor = "#e08888";
        return false;
    }
    if (Global.aliases.containsName(inputBox.value)) {
        document.getElementById('aliasError').style.display = 'inline';
        inputBox.style.borderBottomColor = "#e08888";
        return false;
    } else {
        document.getElementById('aliasError').style.display = 'none';
        inputBox.style.borderBottomColor = "#8bbb8d";
    }
    return true;
}

function cancelAliasClick() {
    Global.aliasTermInput.value = '';
    Global.aliasNameInput.value = '';
    Global.aliasFrame.style.display = 'none'; 
    Global.inputOutputFrame.style.display = 'none';
}

function outputLatexClick() {
    cancelAliasClick();
    generatePage(derivationTree.toLatex());
}

function saveFileClick() {
    downloadFile(generateFileText()); 
    cancelAliasClick();
}

function importFromFileAliasesClick() {
    var fr = new FileReader();
    var file = document.getElementById('fileInputBoxAliases').files[0];
    fr.onload = function(e) {
        var text = e.target.result;        
        var derivation = textToDerivation(text);
        if (derivation) {
            refresh();
            document.getElementById('importAliasesButton').innerHTML =
                'IMPORT ALIASES FROM A FILE (' + derivation.aliases + ' LOADED)';
            Global.infoFrame.innerHTML = "<em>" + derivation.aliases +
            " alias" + (derivation.terms > 1 ? "s" : "")
            + " loaded</em> — " + Global.infoFrame.innerHTML;

        }
    };
    fr.readAsText(file);
    cancelAliasClick();
}

function importFromFileClick() {
    var fr = new FileReader();
    var file = document.getElementById('fileInputBox').files[0];
    fr.onload = function(e) {
        var text = e.target.result;   
        var derivation = textToDerivation(text);
        if (derivation && derivation.terms > 0) {
            Settings.discipline = TypeDiscipline[derivation.discipline];
            currentNode = derivationTree = derivation.derivation;
            while (currentNode.childDerivation) {
                currentNode = currentNode.childDerivation;
            }
            refresh();
            Global.infoFrame.innerHTML = "<em>" + derivation.terms +
            " term" + (derivation.terms > 1 ? "s" : "")
            + " loaded</em> — " + Global.infoFrame.innerHTML;
        }
        var state = Settings.dropParens;
        Settings.dropParens = false;
        location.hash = encodeURI(TypeDiscipline.toName(Settings.discipline) +
            currentNode.term.toDisplay());
        Settings.dropParens = state;
        document.getElementById('welcomeFrame').style.display = 'none';
        document.getElementById('applicationFrame').style.display = 'block';
    };
    fr.readAsText(file);
    cancelAliasClick();
}

function showIoClick() {
    cancelAliasClick();
    Global.settingsMenu.style.display = 'none';
    Global.inputOutputFrame.style.display = 'block'; 
}

function aliasUseCurrentClick() {
    var state = Settings.dropParens;
    Settings.dropParens = false;
    Global.aliasTermInput.value = currentNode.term.toDisplay();
    Settings.dropParens = state;
    slashToLambdaAlias(Global.aliasTermInput);
}

/*if both name and term in the input boxes are correct, add
 a new alias, marked as user-defined, erase input boxes
 for further use, hide the window, re-renders derivation.*/
function acceptNewAliasClick() {
    if (sanitizeAliasName() && slashToLambdaAlias(Global.aliasTermInput)) {
        Global.aliases.addAlias(Global.aliasNameInput.value, parse(Global.aliasTermInput.value), true); 
        Global.aliasTermInput.value = "";
        Global.aliasNameInput.value = "";
        Global.aliasFrame.style.display = 'none';
        refresh();
    } 
}

function aliasAdditionClick() {
    cancelAliasClick();
    Global.settingsMenu.style.display = 'none';
    Global.aliasFrame.style.display = 'block';  
    sanitizeAliasName();
    slashToLambdaAlias(Global.aliasTermInput);
}

function setStrategy(str) {
    Settings.strategy = EvaluationStrategy[str];
    Global.strategyMenu.style.display = 'none';
    refresh();
}

function keyboardProcess(e) {
    e = e || window.event;

    if (e.keyCode == '38') {//arrow up
        if (currentNode.parentDerivation) {
            currentNode = currentNode.parentDerivation;
            refresh();
            return;
        }
    }

    if (e.keyCode == '40') {//arrow down
        if (currentNode.childDerivation) {
            currentNode = currentNode.childDerivation;
            refresh();
            return;
        }
    }
}
