
Parser = {/*Parser object : String -> Term */
    constructor(word) {
        this.index = 0;
        this.word = word;
        this.errmsg = null;
    },

    /*moves index to the next non white character*/
    eatWhite() {
        while (!this.end() && this.word[this.index].match(/\s/)) {
            this.index++;
        }
    },

    /*returns remaining string*/
    remains() {
        return this.word.substr(this.index);
    },
 
    /*returns true iff there is no more string to parse*/
    end() {
        return this.index >= this.word.length;
    },

    /*sets new string for parsing*/
    reset(str) {
        this.index = 0;
        this.word = str;
        this.errmsg = null;
    },

    error(t, i = this.index) {
        if (this.errmsg == null) {
            this.errmsg = { index:i, tokenName:t };
        }
    },
    
    /* returns parsed term object, null if not possible */
    parse(str, preprocessor = true) {
        if (preprocessor) {
            str = Parser.preprocess(str);
        }
        if (str == null) {
            return null;
        }
        Parser.reset(str);
        var x = Parser.parseTermComplete();
        if (x && Parser.remains() == "") {
            return x;
        }
        return null;
    },

    /* parsing with backtracked trial */
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
    },

    /*parse alias or constant*/
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
            return null;
        }
        var word = chars.join("");
        var alias = word.match(/[0-9]{4,}/) ? null : OLCE.Data.aliases.getAliasByName(word);

        alias = alias &&
            OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED && alias.simpleTypedOnly ?
            alias.term : 
            OLCE.Settings.discipline != TypeDiscipline.SIMPLY_TYPED && alias && !alias.simpleTypedOnly ?
            alias.term : null;
        var constant = OLCE.Data.constants.map(x => x.name).indexOf(word);
        constant = constant >= 0 ? OLCE.Data.constants[constant] : null;
        constant = word.match(/-?[0-9]/) ? Constant.pri_n(word) : constant;

        if (!alias || !constant) {
            return alias ? alias : constant;
        }
		if (other) {
            return OLCE.Settings.preferConstants ? alias : constant;
        }
        return OLCE.Settings.preferConstants ? constant : alias;
    },

    /*parse variable*/
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
    },

    /* parse some character 'c' */
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
    },

    /* parse type constructor arrow */
    parseArrow() {
        return this.parseCharacter("→");
    },

    /* parse abstraction */
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
        var otherVariables = [];
        var current;
        while (OLCE.Settings.discipline != TypeDiscipline.SIMPLY_TYPED &&
                (current = this.maybe('parseVar'))) {
            otherVariables.push(current);
        }
        if (OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            check = check && this.parseCharacter(':');   
            type = this.parseTypeComplete();
            if (!type) {
                return null;
            }
        }
        check = check && this.parseCharacter('\\.');
        var term = this.parseTermComplete();
        check = check && this.parseCharacter('\\)');

        if (!term || !variable || !check) {
            return null;
        }
        var result = term;
        for (var i = otherVariables.length - 1; i >= 0; i--) {
            result = new Abs(otherVariables[i], result);   
        }
        return new Abs(variable, result, type);
    },

    /*parse let expression*/
    parseLet() {
        var rec = false;
        var args = [];
        var fType = null;

        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
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
        if (rec && OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            this.parseCharacter(':');
            fType = this.parseTypeComplete();
            if (fType == null) {
                return null;
            }
        }
        var currentVar;
        while ((OLCE.Settings.discipline != TypeDiscipline.SIMPLY_TYPED) &&
                (currentVar = this.maybe('parseVar'))) {
            args.push(currentVar);
        }
        if (!this.parseCharacter('=')) {
            return null; 
        }
        var t = null;
        var term1 = this.parseTerm(); 
        if (!term1) {
            return null;
        }
        var others = [];
        var current;
        while (this.remains().match(/^\s*In/) == null && (current = this.maybe('parseTerm'))) {
            others.push(current);  
        }
        for (var i = 0; i < others.length; i++) {
            term1 = new App(term1, others[i]); 
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
        var allTerms = [term2];
        var result = allTerms[0];
        while (t = this.maybe('parseTerm')) {
            allTerms.push(t);  
        }
        for (var i = 1; i < allTerms.length; i++) {
            result = new App(result, allTerms[i]);
        }
        return variable && term1 && term2 ?
            new Let(variable, term1, result, fType, rec) : null;
    },

    /* parse application, arbitrary (>=2) number of terms */
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
    },

    /* parse int or bool */
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
    },

    /* parse function type, arbitrary (>=2) number */
    parseFunctionType() {
        if (this.errmsg != null) {
            return null;
        }
        this.parseCharacter('\\(');
        var from = this.parseType();
        this.parseCharacter('→');
        var to   = this.parseType();
        
        var others = [from, to];
        while (this.maybe('parseArrow')) {
            others.push(this.parseType());
        }
        this.parseCharacter('\\)');
        var result = others[others.length - 1];
        if (result == null) {
            return null;
        }
        for (var i = others.length - 2; i >= 0; i--) {
            if (others[i] == null) {
                return null;  
            }
            result = new FunctionType(others[i], result); 
        }
        return result;
    },

    /* parse any type and any number of */
    parseTypeComplete() {
        var others = [this.parseType()];
        while (this.maybe('parseArrow')) {
            others.push(this.maybe('parseType'));
        }
        var result = others[others.length - 1];
        for (var i = others.length - 2; i >= 0; i--) {
            if (others[i] == null) {
                return null; 
            } 
            result = new FunctionType(others[i], result);
        }
        return result;
    },

    /*parse either function type of base type */
    parseType() {
        var type = null;
        type = this.maybe('parseBaseType');
        type = type ? type : this.maybe('parseFunctionType');
        return type;
    },

    /* parse one of either abs, let, app, or var */
    parseTerm() {
        var term = this.maybe('parseApp');
        term = term == null ? this.maybe('parseLet') : term;
        term = term == null ? this.maybe('parseAliasPrimitive') : term;
        term = term == null ? this.maybe('parseVar') : term;
        term = term == null ? this.maybe('parseAbs') : term;
        this.eatWhite();
        return term;
    },

    /* parse arbitrary term */
    parseTermComplete() {
        var term  = this.parseTerm();
        if (term == null) {
            return null;
        }
        var current;
        while (current = this.maybe('parseTerm')) {
            term = new App(term, current); 
        }
        return term;
    },

    /*adds necessary parens around abstraction*/
    abstractionParenthesis(string) {
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
                    string.substr(i + 1, 6) == "LetRec") {
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
    },

    preprocess(string) {
        string = string.replace(/\\/g, "λ")
                       .replace(/->/g, "→")
                       .replace(/,/g, " In Let ");
        return Parser.abstractionParenthesis(string);
    },
}//Parser

