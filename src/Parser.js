
// experimental
class Parser {
    constructor(word) {
        this.index = 0;
        this.word = word;
        this.errmsg = null;
    }

    eatWhite() {
        while (!this.end() && this.word[this.index].match(/\s/)) {
            this.index++;
        }
    }

    remains() {
        return this.word.substr(this.index);
    }
 
    end() {
        return this.index >= this.word.length;
    }

    error(t, i = this.index) {
        if (this.errmsg == null) {
            this.errmsg = { index:i, tokenName:t };
        }
    }
    
    maybe(fn) {
        var previousError = this.errmsg;
        var previousIndex = this.index;

        var result = this[fn]();
        if (result) {
            return result;
        }

        this.errmsg = previousError;
        this.index = previousIndex;
        return null;
    }

    parseAliasPrimitive() {
       if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            this.error("alias");
            return null;
        }

        var chars = []; 
        var letter = "";
        var other = false;

        if (!this.end() && this.word[this.index].match(/!/)) {
            other = true;
            this.index++;
        }

        if (!this.end() &&
                (letter = this.word[this.index].match(/[A-Z]/))) {
            chars.push(letter);
            this.index++;
            while (!this.end() &&
                    (letter = this.word[this.index].match(/[A-Z]/))) {
                chars.push(letter);
                this.index++;
            }
        } else if (!this.end() &&
                (letter = this.word[this.index].match(/-|[0-9]/))) {
            chars.push(letter);
            this.index++;
            while (!this.end() &&
                    (letter = this.word[this.index].match(/[0-9]/))) {
                chars.push(letter);
                this.index++;
            }
        } else {
            this.error("alias");
            return null;
        }
    
        var word = chars.join("");
        var alias = word.match(/[0-9]{4,}/) ? null : Global.aliases.getTerm(word);
        var constant = Global.constants.map(x=>x.name).indexOf(word);
        constant = constant >= 0 ? Global.constants[constant] : null;
        constant = word.match(/-?[0-9]/) ? pri_n(word) : constant;

        if (!alias || !constant) {
            return alias ? alias : constant;
        }

		if (other) {
            return Settings.preferConstants ? alias : constant;
        }
        return Settings.preferConstants ? constant : alias;
    }

    parseVar() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (this.word[this.index] == null) {
            this.error("variable");
            return null;
        }

        var letter = "";
        var number = "";

        letter = this.word[this.index].match(/[a-z]/);
        if (!letter) {
            this.error("variable");
            return null;
        }
        this.index++;
        letter = letter[0];
        var s;
        while (!this.end() && (s = this.word[this.index].match(/[0-9]/))) {
            number += s[0]; 
            this.index++;
        }

        return this.errmsg == null ? new Var(letter + number) : null;
    }

    parseCharacter(c) {
        if (this.errmsg != null) {
            return false;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            this.error(c);
            return false;
        }
        if (this.word[this.index].match(new RegExp(c))) {
            this.index++;
            return true;
        }
        this.error(c);
        return false;
    }

    parseAbs() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();         
        if (!this.word[this.index]) {
            this.error("abstraction");
            return null;
        }
       
        var type = null;
        var check = true;
        check = check && this.parseCharacter('\\(');
        check = check && this.parseCharacter('λ');
        var variable = this.parseVar();

        if (Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            check = check && this.parseCharacter(':');   
            type = this.parseType();
            if (!type) {
                return null;
            }
        }

        check = check && this.parseCharacter('\\.');
        var term = this.parseTerm();
        check = check && this.parseCharacter('\\)');

        if (!term || !variable || !check) {
            return null;
        }
        
        return new Abs(variable, term, type);
    }

    parseLet() {
        var rec = false;
        var args = [];

        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            this.error("let");
            return null;
        }
        if (this.word.substr(this.index, 3).match(/Let/)) {
            this.index += 3;   
        } else {
            return null;
        }
        if (this.word.substr(this.index, 3).match(/Rec/)) {
            rec = true; 
            this.index += 3;
        }

        var variable = this.parseVar();
        var currentVar;
        while (currentVar = this.maybe('parseVar')) {
            args.push(currentVar);
        }
        if (!this.parseCharacter('=')) {
            return null; 
        }

        var term1 = this.parseTerm(); 
        if (!term1) {
            return null;
        }

        for (var i = args.length - 1; i >= 0; i--) {
            term1 = new Abs(args[i], term1.copy());    
        }

        this.eatWhite();
        if (this.word.substr(this.index, 2).match(/In/)) {
            this.index += 2;
        } else {
            return null;
        }
        var term2 = this.parseTerm();
        if (Settings.discipline != TypeDiscipline.UNTYPED) {
            Settings.strategy = EvaluationStrategy.CALL_BY_VALUE;
            Settings.lockStrategy = true;
        }
        return variable && term1 && term2 ?
            new Let(variable, term1, term2, [], rec) : null;
    }

    parseApp() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();         
        if (!this.word[this.index]) {
            this.error("application");
            return null;
        }
        
        var check = true;
        check = check && this.parseCharacter('\\(');
        var term1 = this.parseTerm();
        var term2 = this.parseTerm();

        var anotherTerms = [];
        var aTerm;
        while (aTerm = this.maybe('parseTerm')) {
            anotherTerms.push(aTerm); 
        }

        check = check && this.parseCharacter('\\)');

        if (!term1 || !term2 || !check) {
            return null;
        }

        var result = new App(term1, term2);
        for (var i = 0; i < anotherTerms.length; i++) {
            result = new App(result, anotherTerms[i]); 
        }
        
        return result;
    }

    parseBaseType() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (this.word.substr(this.index, 4).match(/Bool/)) {
            this.index += 4;
            return new BaseType('Bool');
        } else if (this.word.substr(this.index, 3).match(/Int/)) {
            this.index += 3;
            return new BaseType('Int');
        }
        this.error("missing type");
        return null;
    }

    parseFunctionType() {
        if (this.errmsg != null) {
            return null;
        }
        this.parseCharacter('\\(');
        var from = this.parseType();
        this.parseCharacter('→');
        var to   = this.parseType();
        this.parseCharacter('\\)');
        if (from == null || to == null) {
            return null;
        } 
        return new FunctionType(from, to);
    }

    parseType() {
        var type = null;
        type = this.maybe('parseBaseType');
        type = type ? type : this.maybe('parseFunctionType');
        return type;
    }

    parseTerm() {
        var term = null;
        term = term == null ? this.maybe('parseLet') : term;
        term = term == null ? this.maybe('parseAliasPrimitive') : term;
        term = term == null ? this.maybe('parseVar') : term;
        term = term == null ? this.maybe('parseAbs') : term;
        term = term == null ? this.maybe('parseApp') : term;
        this.eatWhite();
        return term;
    }
}

function abstractionMultiple(string) { // \xyz.T -> \x.\y.\z.T
    if (string == null || Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
        return string;
    }
    var result;
    var resultString = "";
    var stringToLambdas = (s) => {
        var check = s.match(/(\s*[a-z][0-9]*)+/g);
        var r;
        var res = [];
        if (check == null || check[0].trim() != s.trim()) {
            return null;
        }
        while (r = s.match(/^\s*[a-z][0-9]*/)) {
            s = s.substr(r[0].length);
            res.push(r[0].trim());
        }
        return res.map(x => "λ" + x + ".").join("");
    };

    while (result = string.match(/^([^λ]*)λ(.*?)\.(.*)/)) {
        resultString += result[1];
        var s = stringToLambdas(result[2]);
        if (s == null) {
            return null;
        }
        resultString += s;
        string = result[3];
    }
    
    return resultString + string;
}

function abstractionParenthesis(string) { // \x.\y.\z.T -> (\x.(\y.(\z.(T))))
    if (string == null) {
        return null;
    }

    var index = 0; 
    var isParenBefore = false;
    var findEnd = (i) => {
        var parensStack = 0;
        var afterDot = false;
        while (i < string.length && parensStack >= 0) {
            if (string[i] == '.') {
                afterDot = true;
            }
            if (string[i] == ':') {
                afterDot = false;
            }

            if (afterDot) {
                if (string[i] == ')' || string.substr(i + 1, 2) == "In") {
                    parensStack--;
                } 
                if (string[i] == '(' || string.substr(i + 1, 3) == "Let" ||
                string.substr(i + 1,6) == "LetRec") {
                    parensStack++;
                }
            }
            i++;
        } 
        return i;
    }
    var lambdaWithNoParens = (s) => {
        if (s.match(/λ/g)) {
            return s.match(/\(\s*λ/g) != null ? 
                s.match(/λ/g).length != s.match(/\(\s*λ/g).length :
                true;
        }
        return false;
    }
    for (var i = 0; i < string.length; i++) {
        if (string[i] == "λ") {
            if (lambdaWithNoParens(string.substring(0, i + 1))) {
                var namespaceEnd = findEnd(i);
                string = string.substring(0, i) + "(" +
                    string.substring(i, namespaceEnd) + ")" +
                    string.substring(namespaceEnd, string.length);
            }
        }
    }
    return string;
}

function applicationParenthesis(string) {
    if (string == null || string.length == 0) {
        return "";
    }

    var getInner = (s, from = 0) => {
        var start = 0;
        var stack = 0;
        var inside = false;
        var i = from;
        while (i < string.length && stack >= 0) {
            if (string[i] == '.') {
                start = i + 1;
                inside = true;
            }
            i++;
            if (inside && string[i] == '(') {
                stack++; 
            }
            if (inside && string[i] == ')') {
                stack--;
            }
        }
             
        console.log("inner " + s.substring(start, i));
        return {
            begin: start, end: i
        };
    }; 
    var replace = (s, from = 0) => {
        var bounds = getInner(string, from);
        if (bounds.begin == bounds.end) {
            return s;
        } 
        var substring = s.substring(bounds.begin, bounds.end);
        console.log("first >" + s.substring(0, bounds.begin) + "<" );
        console.log("sub is>" + substring + "<");
        console.log("end   >" + s.substring(bounds.end, s.length) + "<");
        if (substring.match(/^\(.*\)$/) || parse(substring, false)) {
            return s; 
        }
        return s.substring(0, bounds.begin) +
            "(" + substring + ")" +
            s.substring(bounds.end, s.length);
    };

    while (replace(string) != string) {
        string = replace(string);
        console.log("NEXT PASS " + string);
    }

    return replace(string);
}

function preprocess(string) {
    string = string.replace(/\\/g, "λ")
                   .replace(/->/g, "→")
                   .replace(/,/g, " In Let ");
    return applicationParenthesis(
           abstractionParenthesis(
           abstractionMultiple(string)));
}

function parse(str, preprocessor = true) {
    Settings.strategy = EvaluationStrategy.FULL_BETA;
    Settings.lockStrategy = false;
    if (preprocessor) {
        str = preprocess(str);
    }
    if (str == null) {
        return null;
    }
    var p = new Parser(str);
    var x = p.parseTerm();
    if (x && p.remains() == "") {
        return x;
    }

    return null;
} 

function slashToLambda(inputBox) {
    var before = inputBox.selectionStart;
    var withArrow = inputBox.value.replace(/->/g, "→");
    if (withArrow != inputBox.value) {
        inputBox.value = withArrow;
        before--; 
    }
    inputBox.value = inputBox.value.replace(/\\/g, "λ")
    inputBox.value = inputBox.value.replace(/\//g, "÷")
    inputBox.value = inputBox.value.replace(/\*/g, "×")
    inputBox.selectionStart = before;
    inputBox.selectionEnd = before;

    return parse(inputBox.value) != null;
}

function slashToLambdaWelcome(inputBox) {
    if (slashToLambda(inputBox)) {
        inputBox.style.outlineColor = "#8bbb8d";
    } else {
        inputBox.style.outlineColor = "#e08888";
    }
}

function slashToLambdaAlias(inputBox) {
    if (slashToLambda(inputBox)) {
        inputBox.style.borderBottomColor = "#8bbb8d";
        return true;
    } else {
        inputBox.style.borderBottomColor = "#e08888"; 
    }
    return false;
}

function submitOnEnter(keyEvent) {
    if (keyEvent && keyEvent.keyCode == '13') {
        submit();
    }  
}

function submit() {
    var string = document.getElementById('parserInputBox').value;
    if (parse(string)) {
        reset(parse(string));
        var previousState = Settings.dropParens;
        Settings.dropParens = false;
        location.hash = encodeURI(TypeDiscipline.toName(Settings.discipline) +
            currentNode.term.toDisplay());
        Settings.dropParens = previousState;
        document.getElementById('welcomeFrame').style.display = 'none';
        document.getElementById('applicationFrame').style.display = 'block';
    }
}
