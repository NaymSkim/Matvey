const tasks = [
  {
    id:'direction', section:'impulse', number:'01', title:'Куда направлен импульс?', level:'База', source:'По мотивам вашей СР №24 · вариант 2, задача 1',
    prompt:'Мяч летит по траектории слева направо. В верхней точке вертикальная составляющая скорости равна нулю. Куда направлен импульс мяча? Сопротивлением воздуха пренебречь.',
    analysis:{text:'Известно направление полёта. Нужно определить направление p⃗. Не путай скорость с ускорением: импульс всегда сонаправлен скорости.'},
    conversion:{text:'Числовых величин нет, поэтому перевод в СИ не требуется.'},
    formula:{prompt:'Какая связь определяет направление импульса?',options:['p⃗ = m v⃗','A = Fs cos α','F = ma'],answer:0,hint:'Масса положительна, поэтому векторы p⃗ и v⃗ направлены одинаково.'},
    result:{type:'choice',prompt:'Направление импульса в верхней точке:',options:['Вверх','Вправо','Вниз','Влево'],answer:1,hint:'В верхней точке остаётся горизонтальная скорость вправо.'},
    solution:['Дано: мяч движется слева направо; в верхней точке vᵧ = 0. Найти направление p⃗.','Перевод величин не нужен.','p⃗ = m v⃗, поэтому направление импульса совпадает с направлением скорости.','Скорость в верхней точке направлена вправо. Ответ: импульс направлен вправо.']
  },
  {
    id:'car', section:'impulse', number:'02', title:'Легковой автомобиль', level:'База', source:'Ваша СР №24 · вариант 2, задача 2',
    prompt:'Легковой автомобиль массой 1 т движется со скоростью 90 км/ч. Найди модуль его импульса.',
    analysis:{text:'Дано: m = 1 т, v = 90 км/ч. Найти p. Направление в условии не спрашивают.'},
    conversion:{type:'number',prompt:'1 т = 1000 кг. Сколько м/с составляет 90 км/ч?',answer:25,unit:'м/с',hint:'Чтобы перевести км/ч в м/с, раздели на 3,6.'},
    formula:{prompt:'Какую формулу выберешь?',options:['p = mv','p = m/v','A = Fs'],answer:0,hint:'Импульс равен произведению массы на скорость.'},
    result:{type:'number',prompt:'Вычисли модуль импульса:',answer:25000,unit:'кг·м/с',hint:'Умножь 1000 кг на 25 м/с.'},
    solution:['Дано: m = 1 т, v = 90 км/ч. Найти модуль импульса p.','m = 1000 кг; v = 90 : 3,6 = 25 м/с.','p = mv.','p = 1000 · 25 = 25 000 кг·м/с.']
  },
  {
    id:'balls', section:'impulse', number:'03', title:'Два пластилиновых шарика', level:'Сохранение', source:'Ваша СР №25 · вариант 1, задача 1',
    prompt:'Два пластилиновых шарика летят навстречу друг другу. Модули их импульсов равны 5 · 10⁻² и 3 · 10⁻² кг·м/с. Найди модуль импульса слипшихся шариков.',
    analysis:{text:'Шарики летят навстречу: выбери направление первого за положительное. Тогда p₁ = +0,05, p₂ = −0,03 кг·м/с.'},
    conversion:{text:'Оба импульса уже даны в СИ: кг·м/с. Запиши 5 · 10⁻² = 0,05 и 3 · 10⁻² = 0,03.'},
    formula:{prompt:'Какая запись учитывает встречные направления?',options:['p = p₁ + p₂ = 0,05 + 0,03','p = |p₁ + p₂| = |0,05 − 0,03|','p = p₁ · p₂'],answer:1,hint:'Векторы противоположны; для выбранной оси второй импульс отрицателен.'},
    result:{type:'number',prompt:'Найди модуль общего импульса:',answer:0.02,unit:'кг·м/с',hint:'Вычти 0,03 из 0,05.'},
    solution:['Дано: p₁ = 0,05 и p₂ = 0,03 кг·м/с; направления противоположны. Найти модуль p после сцепления.','Величины уже в СИ. На оси движения p₁ = +0,05, p₂ = −0,03 кг·м/с.','По закону сохранения импульса p = |p₁ + p₂|.','p = |0,05 − 0,03| = 0,02 кг·м/с; направление совпадает с направлением первого шарика.']
  },
  {
    id:'train', section:'impulse', number:'04', title:'Электровоз и вагон', level:'Сохранение', source:'Ваша СР №25 · вариант 1, задача 2',
    prompt:'Электровоз массой 180 т со скоростью 1 м/с сцепился с неподвижным вагоном массой 60 т. Найди скорость их совместного движения.',
    analysis:{text:'До сцепления движется только электровоз. После сцепления оба тела имеют одну скорость v.'},
    conversion:{type:'number',prompt:'Сколько килограммов в 180 т?',answer:180000,unit:'кг',hint:'1 т = 1000 кг. Масса вагона — 60 000 кг.'},
    formula:{prompt:'Как выразить общую скорость?',options:['v = m₁v₁/(m₁ + m₂)','v = (m₁ + m₂)v₁/m₁','v = m₁v₁/m₂'],answer:0,hint:'До удара импульс m₁v₁; после — (m₁ + m₂)v.'},
    result:{type:'number',prompt:'Общая скорость после сцепления:',answer:0.75,unit:'м/с',hint:'180 · 1 : (180 + 60) = 0,75; тонны сокращаются.'},
    solution:['Дано: m₁ = 180 т, v₁ = 1 м/с, m₂ = 60 т, v₂ = 0. Найти общую скорость v.','m₁ = 180 000 кг; m₂ = 60 000 кг.','m₁v₁ = (m₁ + m₂)v, значит v = m₁v₁/(m₁ + m₂).','v = 180 000 · 1 / 240 000 = 0,75 м/с. Скорость уменьшилась после присоединения вагона.']
  },
  {
    id:'cart', section:'impulse', number:'05', title:'Тележка и встречный шар', level:'Со знаком', source:'Ваша СР №25 · вариант 1, задача 3',
    prompt:'Тележка с песком массой 10 кг едет вправо со скоростью 1 м/с. Навстречу летит шар массой 2 кг со скоростью 7 м/с и застревает в песке. Найди модуль скорости тележки после удара.',
    analysis:{text:'Вправо считаем «+». Тогда v₁ = +1 м/с, а v₂ = −7 м/с. После удара массы складываются.'},
    conversion:{text:'Массы в кг, скорости в м/с — все величины уже в СИ. Важно сохранить знак встречной скорости.'},
    formula:{prompt:'Какое уравнение верно для выбранной оси?',options:['(10 + 2)v = 10 · 1 + 2 · 7','(10 + 2)v = 10 · 1 − 2 · 7','(10 − 2)v = 10 · 1 − 2 · 7'],answer:1,hint:'Импульс шара отрицателен: 2 · (−7) кг·м/с.'},
    result:{type:'number',prompt:'Модуль скорости после удара (можно округлить до сотых):',answer:1/3,tolerance:0.01,unit:'м/с',hint:'Общая скорость v = (10 − 14)/12 = −1/3 м/с. Нужен её модуль.'},
    solution:['Дано: m₁ = 10 кг, v₁ = +1 м/с; m₂ = 2 кг, v₂ = −7 м/с. Найти модуль общей скорости.','Все величины уже в СИ. Знак «−» показывает встречное направление шара.','По сохранению импульса m₁v₁ + m₂v₂ = (m₁ + m₂)v.','v = (10 · 1 + 2 · (−7))/12 = −1/3 м/с. Знак означает движение влево; модуль скорости — примерно 0,33 м/с.']
  },
  {
    id:'olymp-impulse', section:'impulse', number:'06', title:'Сила на графике и трение', level:'Олимпиада', source:'«Надежда энергетики», 2019, 9 класс · задача 1.21.1 из вашей олимпиадной подборки',
    prompt:'Тело массой 2 кг сначала покоится на горизонтальной поверхности. Горизонтальная сила меняется по графику. Через 4 с скорость стала 12,5 м/с. Найди коэффициент трения. Прими g = 10 м/с².',
    figure:'force', scan:'assets/olympiad-1-21-1.jpg',
    analysis:{text:'Не считай весь импульс приложенной силы изменением импульса тела: сначала тело стоит. Обозначь момент начала скольжения t₀. До него сила трения покоя уравновешивает приложенную силу.',check:{type:'choice',prompt:'Когда начинается скольжение?',options:['Когда F = μmg','Сразу при t = 0','Только после t = 4 с'],answer:0,hint:'Предельная сила трения покоя равна μmg.'}},
    conversion:{type:'number',prompt:'Все величины уже в СИ. Какова площадь под графиком F(t) от 0 до 4 с?',answer:60,unit:'Н·с',hint:'Треугольник от 0 до 2 с: 20 Н·с. Прямоугольник от 2 до 4 с: 40 Н·с.'},
    formula:{prompt:'Как связать движение после t₀ с импульсом?',options:['mv = импульс приложенной силы после t₀ − импульс трения после t₀','mv = площадь под всем графиком от 0 до 4 с','mv = μmg · 4'],answer:0,hint:'Пока тело покоилось, результирующий импульс был нулевым.'},
    result:{type:'number',prompt:'Коэффициент трения μ:',answer:0.5,unit:'',hint:'F = 10t на первом участке, поэтому t₀ = 2μ. Подставь в уравнение импульсов: 60 − 5t₀² − 20μ(4 − t₀) = 25.'},
    solution:['Дано: m = 2 кг, v₄ = 12,5 м/с, g = 10 м/с². В первые секунды тело неподвижно. Найти μ. До скольжения 10t₀ = μmg = 20μ, значит t₀ = 2μ.','Всё уже в СИ. Площадь под графиком за 0–4 с: (2 · 20)/2 + 2 · 20 = 60 Н·с. Площадь за 0–t₀ равна 5t₀² Н·с.','Только после t₀: mv₄ = (60 − 5t₀²) − μmg(4 − t₀). Слева 2 · 12,5 = 25 кг·м/с.','Подставляем t₀ = 2μ: 25 = 60 − 20μ² − 20μ(4 − 2μ) = 60 − 80μ + 20μ². Получаем 4μ² − 16μ + 7 = 0. Корни 0,5 и 3,5; μ = 3,5 означал бы t₀ = 7 с, что противоречит движению к 4-й секунде. Ответ: μ = 0,5.']
  },
  {
    id:'work-zero', section:'work', number:'07', title:'Сила вдоль движения', level:'База', source:'Учебная задача для этого сайта',
    prompt:'Сила 15 Н направлена вдоль перемещения тела на 3 м. Найди работу этой силы.',
    analysis:{text:'Сила и перемещение направлены одинаково. Угол между ними α = 0°, поэтому работа положительна.'},
    conversion:{type:'number',prompt:'Сила и путь уже в СИ. Чему равен cos 0°?',answer:1,unit:'',hint:'Косинус нулевого угла равен 1.'},
    formula:{prompt:'Какая формула учитывает угол?',options:['A = Fs cos α','A = F/s','A = mv'],answer:0,hint:'Работа равна произведению силы, перемещения и косинуса угла между ними.'},
    result:{type:'number',prompt:'Работа силы:',answer:45,unit:'Дж',hint:'15 · 3 · 1 = 45.'},
    solution:['Дано: F = 15 Н, s = 3 м, α = 0°. Найти A.','Величины уже в СИ; cos 0° = 1.','A = Fs cos α.','A = 15 · 3 · 1 = 45 Дж. Положительный знак согласуется с направлением силы.']
  },
  {
    id:'work-right', section:'work', number:'08', title:'Сила поперёк движения', level:'Угол 90°', source:'Учебная задача для этого сайта',
    prompt:'Тело переместилось на 5 м по горизонтали. На него действует сила 20 Н, направленная вертикально вверх. Какую работу совершает эта сила?',
    analysis:{text:'Сила вертикальна, перемещение горизонтально. Угол между ними 90°.'},
    conversion:{type:'number',prompt:'Данные уже в СИ. Чему равен cos 90°?',answer:0,unit:'',hint:'Перпендикулярная составляющая силы не создаёт работу при таком перемещении.'},
    formula:{prompt:'Как рассчитать работу?',options:['A = Fs cos α','A = Fs','A = mg/s'],answer:0,hint:'Без косинуса ты не учтёшь направление силы.'},
    result:{type:'number',prompt:'Работа вертикальной силы:',answer:0,unit:'Дж',hint:'20 · 5 · 0 = 0.'},
    solution:['Дано: F = 20 Н, s = 5 м; сила перпендикулярна перемещению.','Величины в СИ; α = 90°, cos 90° = 0.','A = Fs cos α.','A = 20 · 5 · 0 = 0 Дж. Сила есть, но вдоль перемещения её составляющая равна нулю.']
  },
  {
    id:'work-obtuse', section:'work', number:'09', title:'Сила мешает движению', level:'Угол 120°', source:'Учебная задача для этого сайта',
    prompt:'На тело действует сила 20 Н под углом 120° к направлению перемещения. Тело сместилось на 2 м. Найди работу этой силы со знаком.',
    analysis:{text:'Угол тупой, поэтому продольная составляющая силы направлена против перемещения. Работа должна быть отрицательной.'},
    conversion:{type:'number',prompt:'Величины уже в СИ. Чему равен cos 120°?',answer:-0.5,unit:'',hint:'cos(180° − 60°) = −cos 60° = −1/2.'},
    formula:{prompt:'Какую формулу использовать?',options:['A = Fs cos α','A = Fs sin α','A = F/s'],answer:0,hint:'Нужна проекция силы вдоль перемещения.'},
    result:{type:'number',prompt:'Работа силы со знаком:',answer:-20,unit:'Дж',hint:'20 · 2 · (−1/2) = −20.'},
    solution:['Дано: F = 20 Н, s = 2 м, α = 120°. Найти работу A со знаком.','Всё в СИ; cos 120° = −1/2.','A = Fs cos α.','A = 20 · 2 · (−1/2) = −20 Дж. Отрицательный знак показывает, что сила препятствует движению.']
  },
  {
    id:'olymp-work', section:'work', number:'10', title:'Канат на наклонной плоскости', level:'Олимпиада', source:'Олимпиада КФУ, 2019, 9 класс · задача 1.23.1 из вашей олимпиадной подборки',
    prompt:'Канат массой m и длиной L лежит на наклонной плоскости. Его верхний конец находится в C, нижний — в A. Верхний конец медленно перемещают в B через O. AO = OB = 1,5L, коэффициент трения на обеих поверхностях μ < 1, угол наклона α. Закругление в O пренебрежимо мало по сравнению с L. Найди минимальную работу приложенной силы.',
    figure:'rope', scan:'assets/olympiad-1-23-1.jpg',
    analysis:{text:'Сила должна поднять центр масс каната и преодолеть трение на наклонном и горизонтальном участках. Минимум достигается при медленном перемещении без прироста кинетической энергии.',check:{type:'choice',prompt:'Из каких частей складывается минимальная работа?',options:['Подъём каната + работа против трения на двух участках','Только подъём каната','Только трение на наклонном участке'],answer:0,hint:'На горизонтальном участке трение тоже действует.'}},
    conversion:{type:'choice',prompt:'Числового перевода в СИ нет. Какой средний путь проходит элемент каната по каждому участку?',options:['По L на наклонном и по L на горизонтальном','По 1,5L на наклонном и по 0,5L на горизонтальном','По 0,5L на каждом участке'],answer:0,hint:'Начальные расстояния от O на склоне: от 0,5L до 1,5L, среднее L. Финальные расстояния от O по горизонтали такие же.'},
    formula:{prompt:'Какой общий принцип выбрать?',options:['Aₘᵢₙ = ΔEₚ + работа против трения','Aₘᵢₙ = Fs без учёта угла','Aₘᵢₙ = Δp/Δt'],answer:0,hint:'При медленном перемещении изменение кинетической энергии можно сделать сколь угодно малым.'},
    result:{type:'choice',prompt:'Выбери итоговое выражение:',options:['mgL[sin α + μ(cos α + 1)]','mgL[cos α + μ(sin α + 1)]','mgL(sin α + μ cos α)'],answer:0,hint:'Подъём даёт mgL sin α, трение на склоне — μmgL cos α, на горизонтали — μmgL.'},
    solution:['Сначала весь канат занимает участок CA длиной L: от расстояния 0,5L до 1,5L от O. В конце он целиком лежит горизонтально — от 0,5L до 1,5L слева от O. Перемещаем медленно, чтобы не тратить работу на разгон.','Перевод в СИ не нужен. Средний путь каждого элемента до O по склону равен L; средний путь от O по горизонтали тоже L. Центр масс поднимается на L sin α.','Подъём требует mgL sin α. На склоне сила трения для массы dm равна μg cos α · dm, поэтому суммарная работа против неё — μmgL cos α. На горизонтали — μmgL.','Складываем три вклада: Aₘᵢₙ = mgL sin α + μmgL cos α + μmgL = mgL[sin α + μ(cos α + 1)]. При μ = 0 остаётся только работа подъёма — полезная проверка.']
  }
];

const storageKey = 'impulse-work-progress-v1';
window.impulseWorkChecksBeforeLogin ||= [];
let completed;
try { completed = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { completed = new Set(); }
const total = tasks.length;

function graphFigure(){return `<figure class="task-figure"><svg viewBox="0 0 600 270" role="img" aria-label="График силы: от 0 до 2 секунд сила растёт от 0 до 20 ньютонов, от 2 до 4 секунд равна 20 ньютонам"><rect x="0" y="0" width="600" height="270" rx="8" fill="#f6fbf7"/><g stroke="#d5e7dc" stroke-width="1">${[75,110,145,180,215].map(y=>`<line x1="58" y1="${y}" x2="545" y2="${y}"/>`).join('')}${[58,148,238,328,418,508].map(x=>`<line x1="${x}" y1="44" x2="${x}" y2="215"/>`).join('')}</g><path d="M58 215 L238 75 L418 75 L418 215 Z" fill="#a8ddd0" opacity=".35"/><g stroke="#516e70" stroke-width="2"><line x1="58" y1="215" x2="548" y2="215"/><line x1="58" y1="222" x2="58" y2="38"/></g><polyline points="58,215 238,75 418,75 508,145" fill="none" stroke="#d96e57" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g fill="#506d6e" font-size="17" font-family="system-ui">${[0,1,2,3,4,5].map((v,i)=>`<text x="${58+i*90}" y="244" text-anchor="middle">${v}</text>`).join('')}<text x="29" y="221">0</text><text x="21" y="150">10</text><text x="21" y="80">20</text><text x="545" y="244">t, с</text><text x="6" y="31">F, Н</text></g></svg><figcaption>Читаемый график по оригинальному рисунку. В задаче важен участок от 0 до 4 с.</figcaption></figure>`}
function ropeFigure(){return `<figure class="task-figure"><svg viewBox="0 0 700 310" role="img" aria-label="Канат лежит на наклонной плоскости от C до A. Точка O соединяет склон с горизонтальным участком, точка B расположена слева от O."><rect x="0" y="0" width="700" height="310" rx="8" fill="#f6fbf7"/><path d="M70 96 H355 L632 262" fill="none" stroke="#718e88" stroke-width="4" stroke-linecap="round"/><line x1="435" y1="144" x2="632" y2="262" stroke="#d26e56" stroke-width="15" stroke-linecap="round"/><path d="M578 262 A53 53 0 0 0 584 231" fill="none" stroke="#bd8a52" stroke-width="2"/><g fill="#1a3c45" font-family="system-ui" font-size="22" font-weight="700"><text x="62" y="83">B</text><text x="345" y="83">O</text><text x="426" y="133">C</text><text x="640" y="268">A</text><text x="568" y="227">α</text></g><g fill="#637d7c" font-family="system-ui" font-size="15"><text x="191" y="77">1,5L</text><text x="491" y="127">канат длиной L</text></g></svg><figcaption>Схема по оригинальному рисунку: красным показано начальное положение каната.</figcaption></figure>`}

function controlMarkup(task,key,q){
  if(!q || q.answer===undefined)return '';
  const label=key==='formula'?'Выбор формулы':key==='result'?'Ответ':key==='conversion'?'Перевод или подготовка':'Анализ';
  const input=q.type==='choice'||q.options?`<select aria-label="${label}"><option value="">Выбери вариант</option>${q.options.map((o,i)=>`<option value="${i}">${o}</option>`).join('')}</select>`:`<input type="text" inputmode="decimal" autocomplete="off" aria-label="${label}" placeholder="Введи число">`;
  return `<div class="stage-control">${input}${q.unit?`<span class="stage-unit">${q.unit}</span>`:''}<button type="button" data-action="check" data-task="${task.id}" data-stage="${key}">Проверить</button><button class="hint-btn" type="button" data-action="hint" aria-expanded="false">Подсказка</button></div><p class="stage-feedback" role="status" aria-live="polite"></p><p class="stage-hint" hidden>${q.hint||'Вернись к условию и проверь направления и единицы.'}</p>`;
}
function stageMarkup(task,key,number,title,q){
  const actual=key==='analysis'&&q.check?q.check:q;
  const intro=key==='analysis'?q.text:q.text||q.prompt;
  return `<div class="task-stage" data-stage-box="${key}"><h4>${number} · ${title}</h4><p>${intro}</p>${key==='analysis'&&q.check?`<p>${q.check.prompt}</p>`:''}${controlMarkup(task,key,actual)}</div>`;
}
function taskMarkup(task,index){
  const done=completed.has(task.id);
  const scan=task.scan?`<details class="original-scan"><summary>Открыть оригинальное условие и рисунок</summary><img src="${task.scan}" alt="Скан исходной олимпиадной задачи ${task.number}" loading="lazy"></details>`:'';
  const figure=task.figure==='force'?graphFigure():task.figure==='rope'?ropeFigure():'';
  const solution=task.solution.map(s=>`<li>${s}</li>`).join('');
  return `<details class="task-card ${done?'completed':''}" id="task-${task.id}" data-task-id="${task.id}" ${index===0?'open':''}><summary><span class="task-number">${done?'✓':task.number}</span><span class="task-summary-text"><strong>${task.title}</strong><small>${task.section==='impulse'?'Импульс':'Работа'} · ${task.source}</small></span><span class="task-badge ${task.level==='Олимпиада'?'olympiad':''}">${task.level}</span><span class="task-chevron" aria-hidden="true">⌄</span></summary><div class="task-body"><p class="task-prompt">${task.prompt}</p>${figure}${scan}<div class="task-stages">${stageMarkup(task,'analysis','01','АНАЛИЗ',task.analysis)}${stageMarkup(task,'conversion','02','ПЕРЕВОД В СИ',task.conversion)}${stageMarkup(task,'formula','03','ВЫБОР ФОРМУЛЫ',task.formula)}${stageMarkup(task,'result','04','РЕШЕНИЕ И ПРОВЕРКА',task.result)}</div><div class="task-footer"><span>После попытки откроется полный разбор по этапам.</span><button class="solution-toggle" type="button" data-action="solution" aria-expanded="false" ${done?'':'disabled'}>Показать полное решение</button></div><div class="solution-panel" hidden><h4>Разбор по четырём шагам</h4><ol>${solution}</ol></div></div></details>`;
}
function render(){
  for(const section of ['impulse','work'])document.getElementById(section+'-tasks').innerHTML=tasks.filter(t=>t.section===section).map((t,i)=>taskMarkup(t,i)).join('');
  updateProgress();
}
function updateProgress(){
  const count=tasks.filter(t=>completed.has(t.id)).length;
  document.getElementById('progress-count').textContent=`${count}/${total}`;
  document.getElementById('progress-bar').style.width=`${count/total*100}%`;
}
function checkAnswer(q,value){
  if(q.type==='choice'||q.options)return value!==''&&Number(value)===q.answer;
  const n=Number(String(value).trim().replace(/\s/g,'').replace('−','-').replace(',','.'));
  if(!Number.isFinite(n)||String(value).trim()==='')return false;
  const tolerance=q.tolerance??Math.max(0.000001,Math.abs(q.answer)*0.0001);
  return Math.abs(n-q.answer)<=tolerance;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='hint'){
    const hint=button.closest('.task-stage').querySelector('.stage-hint');
    hint.hidden=!hint.hidden;button.setAttribute('aria-expanded',String(!hint.hidden));button.textContent=hint.hidden?'Подсказка':'Скрыть подсказку';return;
  }
  if(action==='solution'){
    const panel=button.closest('.task-body').querySelector('.solution-panel');
    panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));button.textContent=panel.hidden?'Показать полное решение':'Скрыть решение';return;
  }
  if(action==='check'){
    if(window.impulseWorkLocked)return;
    const task=tasks.find(t=>t.id===button.dataset.task);if(!task)return;
    const key=button.dataset.stage;
    const q=key==='analysis'&&task.analysis.check?task.analysis.check:task[key];
    const box=button.closest('.task-stage');const input=box.querySelector('input,select');const feedback=box.querySelector('.stage-feedback');
    if(!input||!String(input.value).trim()){feedback.textContent='Сначала введи ответ или выбери вариант.';feedback.className='stage-feedback bad';return;}
    const correct=checkAnswer(q,input.value);
    feedback.textContent=correct?'Верно. Можно переходить к следующему шагу.':'Пока нет. Проверь условие или открой подсказку.';
    feedback.className='stage-feedback '+(correct?'good':'bad');
    const shownAnswer=input.tagName==='SELECT'?input.options[input.selectedIndex].text:input.value;
    const check=[task.id,key,correct,shownAnswer];
    if(typeof window.recordImpulseWorkAttempt==='function')window.recordImpulseWorkAttempt(...check);
    else window.impulseWorkChecksBeforeLogin.push(check);
    if(key==='result'){
      const card=button.closest('.task-card');card.querySelector('.solution-toggle').disabled=false;
      if(correct&&!completed.has(task.id)){
        completed.add(task.id);try{localStorage.setItem(storageKey,JSON.stringify([...completed]));}catch{}
        card.classList.add('completed');card.querySelector('.task-number').textContent='✓';updateProgress();
      }
    }
  }
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Enter'||!event.target.matches('.task-stage input'))return;
  event.preventDefault();event.target.closest('.task-stage').querySelector('button[data-action="check"]').click();
});
document.getElementById('reset-progress').addEventListener('click',()=>{
  if(!confirm('Сбросить отметки о решённых задачах на этом устройстве?'))return;
  completed.clear();try{localStorage.removeItem(storageKey);}catch{}render();
});
render();
const target=/^#task-([a-z0-9-]+)$/.exec(location.hash);
if(target){const card=document.getElementById(`task-${target[1]}`);if(card){card.open=true;requestAnimationFrame(()=>card.scrollIntoView({block:'start'}));}}
