
class Excercise {
    constructor() {
        this.complexity = 1;
        this.term       = null;
        this.discipline = TypeDiscipline.UNTYPED;
    }
    
    generateSimpleTerm() {
        this.term = smi;
    }

    generateUntypedTerm() {
        this.term = new App(succuntyped, toNumeral(2));
    }

    generateHMTerm() {
    }

    gradeAnswerTerm(input) {
    }

    gradeAnswerType(input) {
    }
}
