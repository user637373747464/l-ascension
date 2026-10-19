import numpy as np
from manim import *


class VergerVisible(Scene):
    """Verger visible, crible des nombres premiers et lien avec zeta(2)."""

    def construct(self):
        self.camera.background_color = "#000000"

        # Première partie : construction du verger jusqu'à N = 4.
        origine = np.array([-3.1, -2.7, 0.0])
        pas = 1.2

        def point(x, y):
            return origine + RIGHT * (pas * x) + UP * (pas * y)

        titre = Text(
            "Les arbres visibles",
            font_size=38,
            weight=BOLD,
            color=WHITE,
        ).to_edge(UP, buff=0.28)
        sous_titre = MathTex(
            r"(x,y)\in\{1,\ldots,N\}^2",
            font_size=26,
            color=GRAY_A,
        ).next_to(titre, DOWN, buff=0.08)

        observateur = Dot(origine, radius=0.075, color=WHITE).set_z_index(3)
        etiquette_o = MathTex("O", font_size=30, color=WHITE).next_to(
            observateur, DL, buff=0.08
        )
        self.play(FadeIn(observateur, scale=1.5), Write(etiquette_o))
        self.play(FadeIn(titre), FadeIn(sous_titre))

        axe_x = Arrow(
            origine,
            point(4.55, 0),
            buff=0,
            color=GRAY_A,
            stroke_width=2,
            max_tip_length_to_length_ratio=0.035,
        )
        axe_y = Arrow(
            origine,
            point(0, 4.55),
            buff=0,
            color=GRAY_A,
            stroke_width=2,
            max_tip_length_to_length_ratio=0.035,
        )

        elements_axes = [axe_x, axe_y]
        for n in range(1, 5):
            px = point(n, 0)
            py = point(0, n)
            elements_axes.extend(
                [
                    Line(px + UP * 0.055, px + DOWN * 0.055, color=GRAY_B),
                    Line(py + LEFT * 0.055, py + RIGHT * 0.055, color=GRAY_B),
                    MathTex(str(n), font_size=24, color=GRAY_A).next_to(
                        px, DOWN, buff=0.10
                    ),
                    MathTex(str(n), font_size=24, color=GRAY_A).next_to(
                        py, LEFT, buff=0.10
                    ),
                ]
            )

        elements_axes.extend(
            [
                MathTex("x", font_size=30, color=WHITE).next_to(
                    axe_x.get_end(), RIGHT, buff=0.08
                ),
                MathTex("y", font_size=30, color=WHITE).next_to(
                    axe_y.get_end(), UP, buff=0.04
                ),
            ]
        )
        axes = VGroup(*elements_axes)
        self.play(Create(axes), run_time=1.7)
        self.add(observateur, etiquette_o)

        compteur = Text("N = 0", font_size=32, color=YELLOW).move_to(
            [4.45, 2.35, 0]
        )
        nombre_arbres = Text("0 arbre", font_size=22, color=GRAY_A).move_to(
            [4.45, 1.82, 0]
        )
        self.play(FadeIn(compteur), FadeIn(nombre_arbres))

        arbres = {}
        for n in range(1, 5):
            nouveaux_arbres = []
            for x in range(1, n + 1):
                for y in range(1, n + 1):
                    if max(x, y) == n:
                        arbre = Dot(
                            point(x, y),
                            radius=0.078,
                            color=WHITE,
                        ).set_z_index(3)
                        arbres[(x, y)] = arbre
                        nouveaux_arbres.append(arbre)

            nouveau_compteur = Text(
                f"N = {n}", font_size=32, color=YELLOW
            ).move_to(compteur)
            nouveau_nombre = Text(
                f"{n * n} arbres", font_size=22, color=GRAY_A
            ).move_to(nombre_arbres)
            apparition = LaggedStart(
                *[GrowFromCenter(arbre) for arbre in nouveaux_arbres],
                lag_ratio=0.08,
            )
            self.play(
                Transform(compteur, nouveau_compteur),
                Transform(nombre_arbres, nouveau_nombre),
                apparition,
                run_time=1.0,
            )
            self.wait(0.25)

        self.wait(2.0)

        titre_rayons = Text(
            "Exemple : trois rayons",
            font_size=24,
            color=WHITE,
        ).move_to([4.45, 1.05, 0])
        legende_vert = Text(
            "Premier arbre : visible", font_size=19, color=GREEN
        ).move_to([4.45, 0.48, 0])
        legende_rouge = Text(
            "Arbres suivants : cachés", font_size=19, color=RED
        ).move_to([4.45, -0.02, 0])
        self.play(
            Write(titre_rayons),
            FadeIn(legende_vert),
            FadeIn(legende_rouge),
        )

        directions = [
            ((1, 2), [(2, 4)]),
            ((1, 1), [(2, 2), (3, 3), (4, 4)]),
            ((2, 1), [(4, 2)]),
        ]
        segments_visibles = []
        animations_arbres_visibles = []
        continuations_rouges = []
        animations_arbres_caches = []

        for premier, suivants in directions:
            segment_vert = Line(
                origine,
                point(*premier),
                color=GREEN,
                stroke_width=2.7,
            ).set_z_index(1)
            segments_visibles.append(segment_vert)
            animations_arbres_visibles.append(
                arbres[premier].animate.set_color(GREEN)
            )

            if suivants:
                segment_rouge = Line(
                    point(*premier),
                    point(*suivants[-1]),
                    color=RED,
                    stroke_width=2.7,
                ).set_z_index(1)
                continuations_rouges.append(segment_rouge)
                for coordonnee in suivants:
                    animations_arbres_caches.append(
                        arbres[coordonnee].animate.set_color(RED)
                    )

        phase_visible = AnimationGroup(
            *[GrowFromPoint(segment, origine) for segment in segments_visibles],
            *animations_arbres_visibles,
            lag_ratio=0,
        )
        self.play(phase_visible, run_time=1.2)

        phase_cachee = AnimationGroup(
            *[
                GrowFromPoint(segment, segment.get_start())
                for segment in continuations_rouges
            ],
            *animations_arbres_caches,
            lag_ratio=0,
        )
        self.play(phase_cachee, run_time=1.8)

        resultat_fini = Text(
            "Dans le carré N = 4",
            font_size=21,
            color=WHITE,
        ).move_to([4.45, -0.92, 0])
        fraction_finie = MathTex(
            r"\frac{11}{16}=68{,}75\%",
            font_size=31,
            color=YELLOW,
        ).move_to([4.45, -1.48, 0])
        critere = MathTex(
            r"\operatorname{pgcd}(x,y)=1",
            font_size=23,
            color=WHITE,
        ).move_to([4.45, -2.22, 0])
        self.play(Write(resultat_fini), Write(fraction_finie))
        self.play(FadeIn(critere))
        self.wait(2)

        # Passage à la démonstration du critère et du produit.
        self.fade_scene()
        titre_premiers = Text(
            "Pourquoi les nombres premiers ?",
            font_size=35,
            weight=BOLD,
            color=WHITE,
        ).to_edge(UP, buff=0.3)
        intro_premiers = Text(
            "p désigne un nombre premier : 2, 3, 5, 7, ...",
            font_size=24,
            color=GRAY_A,
        ).next_to(titre_premiers, DOWN, buff=0.12)
        critere_pgcd = MathTex(
            r"\operatorname{pgcd}(x,y)=1",
            font_size=31,
            color=GREEN,
        ).move_to([0, 1.75, 0])
        legende_critere = Text(
            "C'est le critère pour qu'un arbre soit visible.",
            font_size=20,
            color=WHITE,
        ).move_to([0, 1.32, 0])
        intro_direct = Text(
            "Si d est un diviseur commun supérieur à 1, alors :",
            font_size=21,
            color=GRAY_A,
        ).move_to([0, 0.75, 0])
        sens_direct = MathTex(
            r"M=\left(\frac{x}{d},\frac{y}{d}\right)"
            r"\quad\left(d=\operatorname{pgcd}(x,y)>1\right)",
            font_size=25,
            color=YELLOW,
        ).move_to([0, 0.3, 0])
        explication_directe = Text(
            "M est un arbre situé avant (x, y) sur le même rayon.",
            font_size=20,
            color=WHITE,
        ).move_to([0, -0.05, 0])
        intro_reciproque = Text(
            "Réciproquement, supposons qu'un arbre M bloque la vue :",
            font_size=20,
            color=GRAY_A,
        ).move_to([0, -0.55, 0])
        reciproque_1 = MathTex(
            r"M=t(x,y),\quad t=\frac{r}{s},\quad"
            r"0<r<s,\quad\operatorname{pgcd}(r,s)=1",
            font_size=23,
            color=WHITE,
        ).move_to([0, -1.0, 0])
        reciproque_2 = Text(
            "M est entier : s divise x et y, donc pgcd(x, y) >= s >= 2.",
            font_size=20,
            color=YELLOW,
        ).move_to([0, -1.65, 0])
        note_premier = Text(
            "Tout diviseur commun supérieur à 1 possède un facteur premier.",
            font_size=19,
            color=GRAY_A,
        ).move_to([0, -2.3, 0])
        self.play(FadeIn(titre_premiers), FadeIn(intro_premiers))
        self.play(
            Write(critere_pgcd),
            FadeIn(legende_critere),
            FadeIn(intro_direct),
            Write(sens_direct),
        )
        self.play(FadeIn(explication_directe), FadeIn(intro_reciproque))
        self.play(Write(reciproque_1), Write(reciproque_2), FadeIn(note_premier))
        self.wait(3)

        # Chaque case représente un couple (x mod p, y mod p).
        # La case rouge (0,0) est la seule où p divise les deux coordonnées.
        self.fade_scene()
        titre_crible = Text(
            "Le crible des premiers",
            font_size=35,
            weight=BOLD,
            color=WHITE,
        ).to_edge(UP, buff=0.3)
        explication_crible = Text(
            "Dans une grille p × p, une seule classe est bloquée : (0, 0).",
            font_size=22,
            color=GRAY_A,
        ).next_to(titre_crible, DOWN, buff=0.12)
        self.play(FadeIn(titre_crible), FadeIn(explication_crible))

        centre_grille = np.array([-3.65, -0.15, 0.0])
        taille_grille = 1.65

        def grille_residus(modulus, cellule, centre, bloque):
            cases = []
            for row in range(modulus):
                for col in range(modulus):
                    centre_case = centre + RIGHT * (
                        (col - (modulus - 1) / 2) * cellule
                    ) + UP * (((modulus - 1) / 2 - row) * cellule)
                    case = Square(
                        side_length=cellule,
                        stroke_color=GRAY_A,
                        stroke_width=0.8,
                    ).move_to(centre_case)
                    est_bloquee = bloque(col, row)
                    case.set_fill(
                        RED if est_bloquee else GREEN,
                        opacity=0.58 if est_bloquee else 0.32,
                    )
                    cases.append(case)
            return VGroup(*cases)

        donnees_p = [
            (2, 0.82, r"1-\frac{1}{2^2}=\frac34", r"\rho_{\{2\}}=\frac34"),
            (
                3,
                0.55,
                r"1-\frac{1}{3^2}=\frac89",
                r"\rho_{\{2,3\}}=\frac34\cdot\frac89=\frac23",
            ),
            (
                5,
                0.33,
                r"1-\frac{1}{5^2}=\frac{24}{25}",
                r"\rho_{\{2,3,5\}}=\frac34\cdot\frac89\cdot\frac{24}{25}=0.64",
            ),
        ]

        grille_actuelle = None
        info_actuelle = None
        for p, cote, facteur_tex, produit_tex in donnees_p:
            grille = grille_residus(
                p,
                taille_grille / p,
                centre_grille,
                lambda x, y: x == 0 and y == 0,
            )
            info = VGroup(
                Text(
                    f"p = {p} : {p**2} classes de résidus",
                    font_size=23,
                    color=WHITE,
                ),
                Text(
                    "1 classe interdite, p² − 1 conservées",
                    font_size=20,
                    color=GRAY_A,
                ),
                MathTex(facteur_tex, font_size=30, color=GREEN),
                MathTex(produit_tex, font_size=24, color=YELLOW),
            ).arrange(DOWN, buff=0.32).move_to([3.55, 0.25, 0])

            if grille_actuelle is None:
                self.play(FadeIn(grille), FadeIn(info))
            else:
                self.play(
                    FadeOut(grille_actuelle),
                    FadeOut(info_actuelle),
                    FadeIn(grille),
                    FadeIn(info),
                )
            grille_actuelle = grille
            info_actuelle = info
            self.wait(1.1)

        etiquette_grille = Text(
            "Vert : conservé     Rouge : bloqué",
            font_size=19,
            color=WHITE,
        ).move_to([-3.65, -1.42, 0])
        self.play(FadeIn(etiquette_grille))
        self.wait(1.5)

        # Exemple modulo 6 : on applique les filtres p=2 et p=3 ensemble.
        # 24 classes sur 36 survivent, soit (3/4) × (8/9).
        self.play(
            FadeOut(grille_actuelle),
            FadeOut(info_actuelle),
            FadeOut(etiquette_grille),
            FadeOut(titre_crible),
            FadeOut(explication_crible),
        )
        titre_produit = Text(
            "Pourquoi multiplier les facteurs ?",
            font_size=32,
            weight=BOLD,
            color=WHITE,
        ).move_to([0, 2.45, 0])
        grille_6 = grille_residus(
            6,
            0.275,
            centre_grille,
            lambda x, y: (x % 2 == 0 and y % 2 == 0)
            or (x % 3 == 0 and y % 3 == 0),
        )
        explication_6 = VGroup(
            Text(
                "Les restes modulo 2 et 3 forment les 36 cases modulo 6.",
                font_size=20,
                color=WHITE,
            ),
            Text(
                "24 cases vertes sur 36 :",
                font_size=21,
                color=GRAY_A,
            ),
            MathTex(
                r"\frac34\times\frac89"
                r"=\frac{24}{36}=\frac23",
                font_size=32,
                color=YELLOW,
            ),
        ).arrange(DOWN, buff=0.35).move_to([3.35, 0.45, 0])
        self.play(
            FadeIn(titre_produit),
            FadeIn(grille_6),
            FadeIn(explication_6),
        )
        self.wait(3)

        # Laisser passer tous les premiers donne le produit infini.
        self.fade_scene()
        titre_zeta = Text(
            "Du produit à la fonction zêta",
            font_size=35,
            weight=BOLD,
            color=WHITE,
        ).to_edge(UP, buff=0.3)
        premiere_ligne = Text(
            "On retire les couples divisibles par un même premier.",
            font_size=23,
            color=GRAY_A,
        ).next_to(titre_zeta, DOWN, buff=0.15)
        densite_produit = MathTex(
            r"\rho=\prod_{p\ \mathrm{premier}}"
            r"\left(1-\frac{1}{p^2}\right)",
            font_size=34,
            color=GREEN,
        ).move_to([0, 1.55, 0])
        definition_zeta = MathTex(
            r"\zeta(2)=\sum_{n=1}^{\infty}\frac{1}{n^2}",
            font_size=32,
            color=WHITE,
        ).move_to([0, 0.75, 0])
        geometrique = MathTex(
            r"\frac{1}{1-p^{-2}}"
            r"=1+p^{-2}+p^{-4}+p^{-6}+\cdots",
            font_size=27,
            color=YELLOW,
        ).move_to([0, -0.15, 0])
        explication_euler = Text(
            "Chaque entier n a une décomposition unique en facteurs premiers.",
            font_size=21,
            color=GRAY_A,
        ).move_to([0, -0.9, 0])
        exemple_factorisation = MathTex(
            r"12=2^2\cdot3"
            r"\quad\Longrightarrow\quad"
            r"\frac{1}{12^2}=2^{-4}3^{-2}",
            font_size=27,
            color=WHITE,
        ).move_to([0, -1.55, 0])
        formule_euler = MathTex(
            r"\prod_{p\ \mathrm{premier}}"
            r"\left(1-p^{-2}\right)^{-1}"
            r"=\zeta(2)",
            font_size=31,
            color=YELLOW,
        ).move_to([0, -2.25, 0])
        self.play(FadeIn(titre_zeta), FadeIn(premiere_ligne))
        self.play(Write(densite_produit), Write(definition_zeta))
        self.play(Write(geometrique), FadeIn(explication_euler))
        self.play(Write(exemple_factorisation))
        self.play(Write(formule_euler))
        self.wait(3)

        # Résultat final : la densité est l'inverse de zeta(2).
        self.fade_scene()
        titre_final = Text(
            "La proportion d’arbres visibles",
            font_size=36,
            weight=BOLD,
            color=WHITE,
        ).to_edge(UP, buff=0.35)
        equation_finale = MathTex(
            r"\rho=\prod_{p\ \mathrm{premier}}"
            r"\left(1-\frac{1}{p^2}\right)"
            r"=\frac{1}{\zeta(2)}",
            font_size=32,
            color=GREEN,
        ).move_to([0, 1.5, 0])
        resultat_bale = MathTex(
            r"\zeta(2)=\frac{\pi^2}{6}"
            r"\quad\Longrightarrow\quad"
            r"\rho=\frac{6}{\pi^2}\approx60{,}79\%",
            font_size=31,
            color=YELLOW,
        ).move_to([0, 0.45, 0])
        note_bale = Text(
            "La valeur ζ(2) = π²/6 est le résultat du problème de Bâle.",
            font_size=21,
            color=GRAY_A,
        ).move_to([0, -0.55, 0])
        comparaison = VGroup(
            Text("Pour N = 4 :", font_size=23, color=WHITE),
            MathTex(r"\frac{11}{16}=68{,}75\%", font_size=29, color=WHITE),
            Text(
                "La proportion 60,79 % est la limite quand N grandit.",
                font_size=21,
                color=GRAY_A,
            ),
        ).arrange(DOWN, buff=0.2).move_to([0, -1.85, 0])
        self.play(FadeIn(titre_final), Write(equation_finale))
        self.play(Write(resultat_bale), FadeIn(note_bale))
        self.play(FadeIn(comparaison))
        self.wait(4)

    def fade_scene(self):
        """Fait disparaître les objets de la scène avant le chapitre suivant."""
        objets = list(self.mobjects)
        if objets:
            self.play(*[FadeOut(objet) for objet in objets], run_time=0.8)


# Rendu : manim -pqh animations/verger_visibilite.py VergerVisible
