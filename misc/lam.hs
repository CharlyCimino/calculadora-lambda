data Term = Var Char 
          | App Term Term
          | Abs Char Term

termToHtml :: String -> Term -> String
termToHtml dep (Var c)   =  classifiedB dep ++ [c] ++ "</span>"
termToHtml dep (Abs c t) =  classifiedB dep ++ "(λ" ++ [c] ++ ".</span>"
                         ++ termToHtml (dep ++ "1") t
                         ++ classifiedB dep ++ ")</span>"
termToHtml dep (App a@(Abs x y) b) = "<span class='redex'>" -- redex element is not base.
                         ++ classifiedB dep ++ "(</span>"
                         ++ "<span class='redA'>" ++ termToHtml (dep ++ "0") a ++ "</span>"  -- this span is not base, just to mark redex children
                         ++ classifiedB dep ++ " </span>" -- space
                         ++ "<span class='redB'>" ++ termToHtml (dep ++ "1") b ++ "</span>" -- this span is not base, just to mark redex children
                         ++ classifiedB dep ++ ")</span>"
                         ++ "</span>"                   -- end of redex
termToHtml dep (App a b) =  classifiedB dep ++ "(</span>"
                         ++ termToHtml (dep ++ "0") a
                         ++ classifiedB dep ++ " </span>" -- space
                         ++ termToHtml (dep ++ "1") b
                         ++ classifiedB dep ++ ")</span>"

classifiedB :: String -> String
classifiedB dep = "<span onmouseover='highlight(this)' onmouseleave='highlight(this, false)' onclick='showClass(this)' class='" ++ dep ++ "'>"
                         
