"use strict";

const STORAGE_KEY = "physics-olympiad-impulse-work-deep-v1";
const choice = (label, prompt, options, answer, hint, explain, lead = "") => ({ label, prompt, options, answer, hint, explain, lead, kind: "choice" });
const number = (label, prompt, answer, unit, hint, explain, lead = "", tolerance = 0.01) => ({ label, prompt, answer, unit, hint, explain, lead, tolerance, kind: "number" });
const section = (phase, steps) => steps.map((step) => ({ ...step, phase }));

const problems = [
  {
    id: "graph",
    short: "Импульс и трение",
    title: "Сила на графике и момент начала движения",
    subtitle: "Сначала выясняем, когда тело сдвинулось. Затем считаем площадь между графиками силы и трения.",
    source: "«Надежда энергетики», 2019, 9 класс · задача 1.21.1",
    sourceUrl: "https://rsr-olymp.ru/upload/files/tasks/5332/2018/14287931-ans-phys-9-final-18-19.pdf",
    prompt: "Тело массой 2 кг покоится на горизонтальной поверхности. Горизонтальная сила F меняется по графику. Через 4 с после начала действия силы скорость тела равна 12,5 м/с. Найди коэффициент трения тела о поверхность. Для численных шагов прими g = 10 м/с².",
    scan: "impulse-work/assets/olympiad-1-21-1.jpg",
    takeaways: [
      "До сдвига сила трения покоя подстраивается под внешнюю силу; импульс тела остаётся нулевым.",
      "После сдвига изменение импульса равно площади между графиками F(t) и силы трения.",
      "Оба корня уравнения нужно проверить по условию начала движения."
    ],
    steps: [
      ...section("Условие и график", [
        choice("Граница времени", "До какого момента нужен график силы для ответа на вопрос задачи?", ["До 5 с", "До 4 с", "До 2 с"], 1, "Скорость дана именно через 4 с.", "Рассматриваем промежуток 0–4 с. Убывание силы после 4 с на искомую скорость не влияет.", "Сначала отдели нужную часть графика от лишней."),
        choice("Два участка", "Как меняется F(t) на нужном промежутке?", ["0–2 с: рост от 0 до 20 Н; 2–4 с: 20 Н", "0–4 с: равномерный рост", "0–2 с: 20 Н; 2–4 с: спад до нуля"], 0, "Посмотри на наклонный отрезок и горизонтальное плато.", "От 0 до 2 с сила линейно растёт до 20 Н; с 2 до 4 с она постоянна и равна 20 Н."),
        number("Наклон графика", "На сколько ньютонов в секунду увеличивается сила в первые 2 с?", 10, "Н/с", "Раздели изменение силы 20 Н на время 2 с.", "Скорость роста силы равна 20/2 = 10 Н/с, поэтому на первом участке F(t) = 10t Н.", "Это уравнение понадобится для момента сдвига."),
        choice("Схема сил", "Нарисуй силы в черновике. Какая схема соответствует телу на горизонтали?", ["F вправо, трение вправо, N вниз", "Только F вправо и mg вниз", "F вправо, трение влево, N вверх, mg вниз"], 2, "Сила трения направлена против возможного или уже начавшегося скольжения.", "На тело действуют F вправо, трение влево, реакция опоры N вверх и тяжесть mg вниз."),
        number("Реакция опоры", "Чему равна реакция опоры N при g = 10 м/с²?", 20, "Н", "Вертикального ускорения нет: N = mg.", "N = mg = 2 · 10 = 20 Н. Именно N входит в формулу силы трения."),
        choice("До сдвига", "Что делает трение покоя, пока тело не движется?", ["Всегда равно μmg", "Уравновешивает текущую силу F, пока хватает предельного значения", "Исчезает при любой малой силе"], 1, "При покое горизонтальная равнодействующая равна нулю.", "До сдвига трение покоя растёт вместе с F: Fтр.пок = F(t), пока F(t) не превысит предельное μN. Поэтому импульс тела пока равен нулю.")
      ]),
      ...section("Начало движения", [
        choice("Условие сдвига", "Что следует из ненулевой скорости через 4 с и максимума F = 20 Н?", ["μ > 1", "μ = 1", "μ < 1"], 2, "Для сдвига сила должна превысить порог μN, а N = 20 Н.", "Порог μN = 20μ Н должен быть меньше 20 Н. Следовательно, μ < 1, а сдвиг происходит ещё на растущем участке до t = 2 с."),
        choice("Пороговая сила", "Какое равенство задаёт момент начала движения t₀?", ["F(t₀) = μmg", "mv₄ = μmg", "F(t₀) = mg/μ"], 0, "Сравни внешнюю силу с предельным трением покоя.", "На границе покоя и скольжения F(t₀) = μN = μmg = 20μ Н."),
        choice("Время старта", "Используй F(t) = 10t Н. Чему равно t₀?", ["20μ с", "2μ с", "μ/2 с"], 1, "Реши равенство 10t₀ = 20μ.", "Из 10t₀ = 20μ получаем t₀ = 2μ с. Условие μ < 1 даёт 0 < t₀ < 2 с."),
        choice("После сдвига", "Каков модуль силы трения скольжения в принятой модели?", ["20 Н", "10μ Н", "20μ Н"], 2, "Трение скольжения равно μN; N уже найдено.", "После начала движения Fтр = μN = 20μ Н. Здесь, как в олимпиадном решении, один коэффициент μ используется для порога сдвига и скольжения.")
      ]),
      ...section("Баланс импульса", [
        choice("Главный закон", "Как связаны изменение импульса и силы за время движения?", ["Δp равно импульсу равнодействующей F − Fтр", "Δp равно площади под F(t) с нуля без вычитаний", "Δp равно работе силы трения"], 0, "Импульс меняет сумма сил, а не одна сила.", "По теореме об импульсе Δp = ∫(F − Fтр)dt на участке скольжения. До t₀ силы взаимно компенсируются.", "Удобно смотреть на площадь между графиком F(t) и горизонтальным уровнем трения."),
        number("Изменение импульса", "Найди Δp = mv₄ − mv₀.", 25, "кг·м/с", "Начальная скорость нулевая.", "Δp = 2 · 12,5 − 0 = 25 кг·м/с, или 25 Н·с."),
        number("Первый участок графика", "Каков импульс внешней силы за первые 2 с?", 20, "Н·с", "Это площадь треугольника с основанием 2 с и высотой 20 Н.", "J₀₋₂ = 2 · 20 / 2 = 20 Н·с. Это импульс приложенной силы, а не итоговый импульс тела."),
        number("Плато графика", "Каков импульс внешней силы за время от 2 до 4 с?", 40, "Н·с", "Это площадь прямоугольника 2 с × 20 Н.", "J₂₋₄ = 20 · (4 − 2) = 40 Н·с."),
        number("Весь внешний импульс", "Сложи площади от 0 до 4 с.", 60, "Н·с", "Сложи 20 Н·с и 40 Н·с.", "J₀₋₄ = 20 + 40 = 60 Н·с. Часть этого импульса до сдвига полностью погашена трением покоя."),
        choice("Импульс до старта", "Какая площадь под F(t) приходится на время 0–t₀?", ["10t₀² Н·с", "5t₀² Н·с", "20t₀ Н·с"], 1, "Высота малого треугольника равна F(t₀) = 10t₀.", "J₀₋ₜ₀ = t₀ · 10t₀ / 2 = 5t₀² Н·с. Столько же даёт противоположный импульс трения покоя."),
        choice("Внешний импульс после сдвига", "Сколько составляет импульс приложенной силы от t₀ до 4 с?", ["60 Н·с", "60 − 5t₀² Н·с", "5t₀² Н·с"], 1, "Из всей площади вычти треугольник до старта.", "Jприл = 60 − 5t₀² Н·с."),
        choice("Импульс трения скольжения", "Каков модуль импульса трения от t₀ до 4 с?", ["20μ(4 − t₀) Н·с", "20μ · 4 Н·с", "5t₀² Н·с"], 0, "Постоянную силу трения умножь на длительность скольжения.", "Jтр = 20μ(4 − t₀) Н·с; знак этого импульса противоположен направлению движения.")
      ]),
      ...section("Уравнение и корни", [
        choice("Баланс площадей", "Какое уравнение выражает закон изменения импульса?", ["25 = 60 − 20μ · 4", "25 = 60 + 5t₀² − 20μ(4 − t₀)", "25 = 60 − 5t₀² − 20μ(4 − t₀)"], 2, "Из внешнего импульса после старта вычти импульс трения скольжения.", "25 = (60 − 5t₀²) − 20μ(4 − t₀). Здесь учтены и задержка старта, и трение во время движения."),
        choice("Подстановка t₀", "Что получится после подстановки t₀ = 2μ и раскрытия скобок?", ["25 = 60 − 80μ + 20μ²", "25 = 60 − 80μ − 20μ²", "25 = 60 − 20μ"], 0, "Посчитай отдельно −5(2μ)² и −20μ(4 − 2μ).", "−5(2μ)² = −20μ², а −20μ(4 − 2μ) = −80μ + 40μ². Вместе: 25 = 60 − 80μ + 20μ²."),
        choice("Квадратное уравнение", "Приведи уравнение к виду с нулём справа и раздели на 5.", ["4μ² + 16μ + 7 = 0", "4μ² − 16μ + 7 = 0", "μ² − 4μ + 7 = 0"], 1, "Перенеси 25 в правую часть, затем раздели все коэффициенты на 5.", "Получаем 20μ² − 80μ + 35 = 0, или 4μ² − 16μ + 7 = 0."),
        choice("Два корня", "Какие два корня имеет уравнение 4μ² − 16μ + 7 = 0?", ["0,5 и 1,5", "−0,5 и 3,5", "0,5 и 3,5"], 2, "Дискриминант равен 16² − 4 · 4 · 7 = 144.", "μ = (16 ± 12)/8. Формально выходят два корня: 0,5 и 3,5.")
      ]),
      ...section("Физическая проверка", [
        number("Отбор ответа", "Введи коэффициент μ, который согласуется с началом движения до 2 с.", 0.5, "", "Для корня 3,5 момент t₀ = 7 с, что противоречит скорости через 4 с.", "Подходит μ = 0,5. Тогда t₀ = 2μ = 1 с. Корень 3,5 отвергаем по условию 0 < t₀ < 2 с."),
        number("Обратная проверка", "При μ = 0,5 внешний импульс после старта равен 55 Н·с, импульс трения — 30 Н·с. Чему равен Δp?", 25, "Н·с", "Вычти 30 Н·с из 55 Н·с.", "Δp = 55 − 30 = 25 Н·с. Деление на массу 2 кг возвращает v₄ = 12,5 м/с: ответ согласуется с условием.")
      ])
    ]
  },
  {
    id: "rope",
    short: "Работа и канат",
    title: "Канат на наклонной плоскости",
    subtitle: "Отмечаем положения каната, считаем подъём центра масс и путь каждого участка по двум поверхностям.",
    source: "Олимпиада КФУ, 2019, 9 класс · задача 9.1.1 (в подборке 1.23.1)",
    sourceUrl: "https://malun.kpfu.ru/sites/default/files/%D0%A6%D0%B5%D0%BD%D1%82%D1%80%20%D0%A0%D1%81%D0%9E%D0%A8/9_%D1%84%D0%B8%D0%B7%D0%B8%D0%BA%D0%B0%20%D0%B7%D0%B0%D0%B4%D0%B0%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D0%BE%D1%82%D0%B2%D0%B5%D1%82%D1%8B.pdf",
    prompt: "Канат массой m и длиной L первоначально лежит на наклонной плоскости от C до A. Его верхний конец перемещают из C в B через O. AO = OB = 1,5L, коэффициент трения везде μ < 1, угол наклона α. В точке O есть малое закругление. Исходный вопрос: какова минимальная работа приложенной силы?",
    modelNote: "Сначала разбираем контактный путь без отрыва каната в модели официального решения: учитываем работу на двух прямых участках. В конце проверим, почему найденная формула не всегда является абсолютным минимумом исходной задачи.",
    scan: "impulse-work/assets/olympiad-1-23-1.jpg",
    takeaways: [
      "Для пути без отрыва работа равна подъёму центра масс плюс потерям на трение на склоне и горизонтали.",
      "У однородного каната средние пути элементов на каждом прямом участке равны L.",
      "Официальный разбор допускает более экономный путь с отрывом каната; контактная формула имеет границы применимости."
    ],
    steps: [
      ...section("Геометрия и модель", [
        choice("Точка C", "Чему равно расстояние OC вдоль наклонной плоскости?", ["0,5L", "L", "1,5L"], 0, "Вычти длину каната AC = L из AO = 1,5L.", "OC = OA − AC = 1,5L − L = 0,5L. Ближайший к O конец каната сначала находится на расстоянии 0,5L.", "Нарисуй O, C и A в черновике именно в таком порядке."),
        choice("Начальный отрезок", "Какие расстояния от O занимают точки каната в начальном положении?", ["От 0 до L", "От 0,5L до 1,5L на склоне", "От L до 2L на горизонтали"], 1, "Один конец в C на 0,5L, другой в A на 1,5L.", "Начальный канат занимает на склоне интервал расстояний x ∈ [0,5L; 1,5L]."),
        choice("Конечный отрезок", "Где лежит канат после перемещения конца в B?", ["От O до L на склоне", "От 0 до L по горизонтали", "От 0,5L до 1,5L по горизонтали от O"], 2, "Конец в B удалён от O на 1,5L, а канат имеет длину L.", "В конце канат целиком лежит на горизонтали; его точки удалены от O на 0,5L–1,5L."),
        choice("Выбранная траектория", "Какой путь подробно рассматривает основной маршрут?", ["Канат остаётся в контакте с поверхностью и проходит через O", "Канат поднимают в воздух целиком", "Канат переносят, не меняя положения концов"], 0, "Так устроен основной расчёт в решении жюри.", "Сначала рассчитываем работу для перемещения без отрыва каната. Это конкретный допустимый путь; вопрос об абсолютном минимуме обсудим после расчёта.")
      ]),
      ...section("Энергетический баланс", [
        choice("Медленное перемещение", "Почему при поиске наименьшей работы для выбранного пути удобно тянуть канат медленно?", ["Трение исчезает", "Изменение кинетической энергии стремится к нулю", "Канат теряет массу"], 1, "При малой скорости начальная и конечная кинетические энергии малы.", "В пределе медленного движения ΔK ≈ 0; лишний разгон только добавил бы работу на кинетическую энергию."),
        choice("Три вклада", "Что нужно сложить в модели контактного пути?", ["Только работы двух сил трения", "Только изменение потенциальной энергии", "Подъём центра масс и потери на двух прямых участках"], 2, "Сила тяжести меняет энергию, а трение действует на склоне и на горизонтали.", "Aконт = ΔU + Aтр,склон + Aтр,горизонталь. Позже проверим границы этой модели."),
        choice("Начальный центр масс", "Как далеко от O по склону находится центр масс однородного каната вначале?", ["L", "0,5L", "1,5L"], 0, "Возьми середину интервала [0,5L; 1,5L].", "Центр масс находится на расстоянии (0,5L + 1,5L)/2 = L от O вдоль склона."),
        choice("Конечный центр масс", "На какой высоте относительно O находится центр масс в конце?", ["На L sin α ниже O", "На высоте O", "На L выше O"], 1, "Всё конечное положение горизонтально и проходит через высоту точки O.", "Конечный центр масс находится на горизонтальной поверхности, то есть на высоте точки O."),
        choice("Подъём центра масс", "На сколько поднялся центр масс?", ["L cos α", "1,5L sin α", "L sin α"], 2, "Вертикальная проекция начального расстояния L вдоль склона равна L sin α.", "Начальный центр масс ниже O на L sin α, конечный — на высоте O. Поэтому Δh = L sin α."),
        choice("Прирост энергии", "Какова работа против силы тяжести?", ["mgL sin α", "mgL cos α", "μmgL"], 0, "Умножь mg на найденный подъём.", "ΔU = mgΔh = mgL sin α. Этот вклад не зависит от трения.")
      ]),
      ...section("Трение на склоне", [
        choice("Масса малого участка", "Чему равна линейная плотность однородного каната?", ["mL", "m/L", "L/m"], 1, "Масса равномерно распределена по длине L.", "Линейная плотность λ = m/L. Для малого отрезка длиной dℓ его масса dm = λdℓ."),
        choice("Элемент каната", "Как записать массу элемента длиной dℓ?", ["dm = mL dℓ", "dm = (L/m)dℓ", "dm = (m/L)dℓ"], 2, "Используй λ = m/L.", "dm = (m/L)dℓ. Сумма масс всех элементов равна m."),
        choice("Нормальная сила", "Чему равна нормальная реакция для элемента dm на склоне?", ["dm·g cos α", "dm·g sin α", "dm·g"], 0, "Возьми составляющую тяжести перпендикулярно плоскости.", "dNсклон = dm·g cos α."),
        choice("Трение элемента", "Какова сила трения этого элемента во время скольжения по склону?", ["μdm·g sin α", "μdm·g cos α", "μmg"], 1, "Умножь нормальную реакцию элемента на μ.", "dFтр,склон = μdm·g cos α. Эта сила действует только пока элемент остаётся на склоне."),
        choice("Путь элемента", "Элемент первоначально находится на расстоянии x от O вдоль склона. Сколько он проходит по склону?", ["L − x", "2L − x", "x"], 2, "Элемент движется от своей начальной точки до O.", "Путь данного элемента по склону равен x. Разные части каната проходят разные расстояния."),
        choice("Средний путь", "Чему равно среднее начальное расстояние x от O для однородного каната?", ["L", "0,5L", "1,5L"], 0, "Усредни границы 0,5L и 1,5L.", "xср = (0,5L + 1,5L)/2 = L. Поэтому суммарный путь с весом по массе равен mL."),
        choice("Работа на склоне", "Какую работу надо совершить против трения на наклонной части?", ["μmgL", "μmgL cos α", "mgL sin α"], 1, "Умножь μg cos α на сумму dm·x = mL.", "Aтр,склон = ∫μg cos α·x dm = μmgL cos α.")
      ]),
      ...section("Трение на горизонтали", [
        choice("Реакция на горизонтали", "Какова нормальная реакция для элемента dm после прохождения O?", ["dm·g cos α", "dm·g sin α", "dm·g"], 2, "На горизонтали вес уравновешивается реакцией опоры.", "dNгор = dm·g, поэтому горизонтальное трение элемента равно μdm·g."),
        choice("Куда придёт элемент", "Если элемент начинал на склоне на расстоянии x от O, на каком расстоянии y от O он закончит путь по горизонтали?", ["y = 2L − x", "y = x", "y = L − x"], 0, "Общий путь каждого элемента вдоль каната: 0,5L до O плюс 1,5L до B, то есть 2L для переднего конца.", "Каждый элемент смещается вдоль линии каната на 2L. Пройдя x по склону, он проходит y = 2L − x по горизонтали."),
        choice("Средний горизонтальный путь", "Чему равно среднее значение y = 2L − x?", ["0,5L", "L", "1,5L"], 1, "Среднее x равно L.", "yср = 2L − xср = L. Это можно увидеть и по конечному интервалу [0,5L; 1,5L]."),
        choice("Работа на горизонтали", "Какой вклад даёт горизонтальное трение?", ["μmgL cos α", "mgL sin α", "μmgL"], 2, "Сила трения элемента μdm·g, средний горизонтальный путь L.", "Aтр,гор = ∫μg·y dm = μmgL.")
      ]),
      ...section("Ответ и границы", [
        choice("Сумма вкладов", "Какую работу даёт разобранный путь без отрыва каната?", ["mgL[sin α + μ(cos α + 1)]", "mgL[cos α + μ(sin α + 1)]", "mgL[sin α + μ cos α]"], 0, "Сложи mgL sin α, μmgL cos α и μmgL.", "Aконт = mgL[sin α + μ(cos α + 1)]. Это формула для выбранной модели контактного пути."),
        choice("Предельные случаи", "Какая пара проверок формулы верна?", ["При μ = 0 остаётся 2mgL; при α = 0 работа исчезает", "При μ = 0 остаётся mgL sin α; при α = 0 получается 2μmgL", "При μ = 0 работа равна mgL cos α; при α = 0 равна μmgL"], 1, "Убирай по очереди трение и наклон.", "Если μ = 0, остаётся подъём mgL sin α. Если α = 0, канат проходит в сумме 2L по горизонтали, поэтому Aконт = 2μmgL."),
        choice("Границы ответа", "Можно ли без дополнительного анализа назвать Aконт абсолютным минимумом исходной задачи?", ["Да, отрыв каната запрещён условием", "Да, если μ < 1", "Нет: отрыв каната может уменьшить потери на трение"], 2, "В условии не сказано, что канат всё время прижат к поверхности.", "Формула Aконт относится к контактному пути. В официальном разборе жюри отдельно отмечает, что при μ > tan α отрыв от плоскости может почти убрать затраты на трение; полный поиск минимума требует сравнить другие траектории.")
      ])
    ]
  }
];

const totalSteps = problems.reduce((sum, problem) => sum + problem.steps.length, 0);
const workspace = document.getElementById("workspace");
const nav = document.getElementById("module-nav");

function emptyState() {
  return { version: 1, selected: problems[0].id, progress: Object.fromEntries(problems.map((problem) => [problem.id, { index: 0, statuses: [] }])) };
}

function loadState() {
  const fallback = emptyState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.version !== 1) return fallback;
    if (problems.some((problem) => problem.id === saved.selected)) fallback.selected = saved.selected;
    for (const problem of problems) {
      const raw = saved.progress?.[problem.id];
      if (!Array.isArray(raw?.statuses)) continue;
      const statuses = raw.statuses.slice(0, problem.steps.length).filter((status) => status === "self" || status === "assisted");
      fallback.progress[problem.id] = { statuses, index: Math.min(Math.max(0, Number(raw.index) || 0), statuses.length) };
    }
  } catch { /* A damaged saved state starts a fresh route. */ }
  return fallback;
}

let state = loadState();
let wrongAttempts = 0;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* The route remains usable without storage. */ }
}

function currentProblem() { return problems.find((problem) => problem.id === state.selected) || problems[0]; }
function currentRun() { return state.progress[currentProblem().id]; }
function completedCount() { return problems.reduce((sum, problem) => sum + state.progress[problem.id].statuses.length, 0); }

function renderNav() {
  nav.replaceChildren();
  problems.forEach((problem, index) => {
    const done = state.progress[problem.id].statuses.length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `module-link${problem.id === state.selected ? " active" : ""}`;
    button.dataset.problem = problem.id;
    button.setAttribute("aria-current", problem.id === state.selected ? "step" : "false");
    button.innerHTML = `<span class="module-num">${index + 1}</span><span>${problem.short}</span><span class="module-count">${done}/${problem.steps.length}</span>`;
    nav.append(button);
  });
}

function renderProgress() {
  const done = completedCount();
  const percent = Math.round(done / totalSteps * 100);
  document.getElementById("progress-text").textContent = `${done} из ${totalSteps} этапов`;
  document.getElementById("progress-percent").textContent = `${percent}%`;
  document.getElementById("progress-fill").style.width = `${percent}%`;
}

function renderProblemCard(problem) {
  return `<article class="problem-card"><span class="source">${problem.source}</span><p>${problem.prompt}</p>${problem.modelNote ? `<p class="model-note">${problem.modelNote}</p>` : ""}<details><summary>Посмотреть исходный рисунок и условие</summary><figure><img src="${problem.scan}" alt="Оригинальное условие и рисунок задачи"><figcaption>Фрагмент исходной олимпиадной подборки. <a href="${problem.sourceUrl}" target="_blank" rel="noopener noreferrer">Официальный разбор ↗</a></figcaption></figure></details></article>`;
}

function renderOptions(problem, run, step) {
  const shift = (run.index * 2 + (problem.id === "rope" ? 1 : 0)) % step.options.length;
  return step.options.map((_, position) => {
    const index = (position + shift) % step.options.length;
    return `<button class="option" type="button" data-option="${index}" aria-pressed="false">${step.options[index]}</button>`;
  }).join("");
}

function renderStep(problem, run) {
  const step = problem.steps[run.index];
  const solved = run.statuses[run.index];
  const backButton = run.index > 0 ? `<button class="secondary-button" type="button" data-action="back">← Предыдущий этап</button>` : "";
  const content = solved
    ? `<div class="feedback good"><p><strong>${solved === "assisted" ? "Этап пройден с разбором." : "Верно."}</strong></p><p>${step.explain}</p></div><div class="step-actions">${backButton}<button class="primary-button" type="button" data-action="next">${run.index === problem.steps.length - 1 ? "Завершить задачу" : "Следующий этап →"}</button></div>`
    : `${step.lead ? `<p class="step-support">${step.lead}</p>` : ""}<p class="step-prompt">${step.prompt}</p>${step.kind === "choice" ? `<div class="options" role="group" aria-label="Варианты ответа">${renderOptions(problem, run, step)}</div>` : `<label class="number-field"><input id="number-answer" type="text" inputmode="decimal" autocomplete="off" aria-label="Числовой ответ" placeholder="Введи число"><span>${step.unit}</span></label>`}<div class="step-actions">${backButton}<button class="primary-button" type="button" data-action="check">Проверить шаг</button><span class="subtle" id="attempt-note">Объяснение откроется после проверки.</span></div><div id="step-feedback" aria-live="polite"></div>`;
  return `<article class="step-card"><div class="step-header"><div><p class="eyebrow">${step.phase} · этап ${run.index + 1} из ${problem.steps.length}</p><h3>${step.label}</h3></div><span class="step-number">${solved ? "✓ Выполнено" : "Твой ход"}</span></div><div class="step-track" aria-hidden="true"><span style="width:${(run.index + (solved ? 1 : 0)) / problem.steps.length * 100}%"></span></div><div class="step-body">${content}</div></article>`;
}

function renderDone(problem) {
  return `<article class="done-card"><p class="eyebrow">Маршрут задачи завершён</p><h3>${problem.title}</h3><p>Ты прошёл все ${problem.steps.length} этапов. Оставь в черновике схему и проверь ключевые идеи ещё раз.</p><ul class="recap">${problem.takeaways.map((item) => `<li>${item}</li>`).join("")}</ul><div class="step-actions"><button class="secondary-button" type="button" data-action="review">Просмотреть этапы с начала</button><button class="secondary-button" type="button" data-action="other">${problems.every((item) => state.progress[item.id].statuses.length === item.steps.length) ? "Посмотреть другую задачу" : "Перейти к другой задаче →"}</button></div></article>`;
}

function render() {
  const problem = currentProblem();
  const run = currentRun();
  renderNav();
  renderProgress();
  workspace.innerHTML = `<div class="workspace-head"><p class="eyebrow">${problem.id === "graph" ? "Импульс силы" : "Механическая работа"} · олимпиада</p><h2>${problem.title}</h2><p>${problem.subtitle}</p></div>${renderProblemCard(problem)}${run.index < problem.steps.length ? renderStep(problem, run) : renderDone(problem)}`;
}

function showFeedback(message, kind, reveal = false) {
  const box = document.getElementById("step-feedback");
  if (!box) return;
  box.className = `feedback ${kind}`;
  box.replaceChildren();
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  box.append(paragraph);
  if (reveal) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.dataset.action = "reveal";
    button.textContent = "Открыть разбор и продолжить";
    button.style.marginTop = "10px";
    box.append(button);
  }
}

function checkStep() {
  const problem = currentProblem();
  const run = currentRun();
  const step = problem.steps[run.index];
  if (!step || run.statuses[run.index]) return;
  let correct = false;
  if (step.kind === "choice") {
    const selected = workspace.querySelector('.option[aria-pressed="true"]');
    if (!selected) { showFeedback("Сначала выбери ответ.", "hint"); return; }
    correct = Number(selected.dataset.option) === step.answer;
  } else {
    const raw = document.getElementById("number-answer")?.value.trim().replace(",", ".") || "";
    if (!raw) { showFeedback("Сначала введи число.", "hint"); return; }
    const value = Number(raw);
    if (!Number.isFinite(value)) { showFeedback("Введи число, например 0,5.", "hint"); return; }
    correct = Math.abs(value - step.answer) <= step.tolerance;
  }
  if (correct) {
    run.statuses[run.index] = "self";
    wrongAttempts = 0;
    saveState();
    render();
    return;
  }
  wrongAttempts += 1;
  document.getElementById("attempt-note").textContent = `Ошибок на этом этапе: ${wrongAttempts}`;
  showFeedback(wrongAttempts >= 3 ? `Пока не получилось. ${step.hint}` : `Проверь ещё раз. ${step.hint}`, wrongAttempts >= 3 ? "bad" : "hint", wrongAttempts >= 3);
}

workspace.addEventListener("click", (event) => {
  const option = event.target.closest(".option");
  if (option) {
    workspace.querySelectorAll(".option").forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "check") checkStep();
  if (action === "back") {
    currentRun().index = Math.max(0, currentRun().index - 1);
    wrongAttempts = 0;
    saveState();
    render();
    workspace.querySelector(".step-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "reveal") {
    const run = currentRun();
    run.statuses[run.index] = "assisted";
    wrongAttempts = 0;
    saveState();
    render();
  }
  if (action === "next") {
    currentRun().index += 1;
    wrongAttempts = 0;
    saveState();
    render();
    workspace.querySelector(".step-card, .done-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "other") {
    state.selected = problems.find((problem) => problem.id !== state.selected).id;
    wrongAttempts = 0;
    saveState();
    render();
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "review") {
    currentRun().index = 0;
    saveState();
    render();
    workspace.querySelector(".step-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

workspace.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.id === "number-answer") checkStep();
});

nav.addEventListener("click", (event) => {
  const target = event.target.closest("[data-problem]");
  if (!target) return;
  state.selected = target.dataset.problem;
  wrongAttempts = 0;
  saveState();
  render();
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
});

const resetButton = document.getElementById("reset-progress");
let resetPending = false;
resetButton.addEventListener("click", () => {
  if (!resetPending) {
    resetPending = true;
    resetButton.textContent = "Подтвердить сброс";
    resetButton.classList.add("confirm-reset");
    return;
  }
  state = emptyState();
  wrongAttempts = 0;
  saveState();
  render();
  resetPending = false;
  resetButton.textContent = "Начать заново";
  resetButton.classList.remove("confirm-reset");
});

document.addEventListener("click", (event) => {
  if (!resetPending || event.target === resetButton) return;
  resetPending = false;
  resetButton.textContent = "Начать заново";
  resetButton.classList.remove("confirm-reset");
});

render();
