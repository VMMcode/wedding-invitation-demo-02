"use strict";

/* ===== МУЗЫКА В ПРОМО-СЕКЦИИ ===== */
const musicBtn = document.querySelector(".promo__music-play");
const audio = document.querySelector(".promo__audio");

if (musicBtn && audio) {
  musicBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {
      });
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => {
    musicBtn.classList.add("is-playing");
    musicBtn.setAttribute("aria-label", "Поставить на паузу");
  });
  audio.addEventListener("pause", () => {
    musicBtn.classList.remove("is-playing");
    musicBtn.setAttribute("aria-label", "Включить музыку");
  });
}

/* ===== ПЛАВНЫЙ СКРОЛЛ ПО СТРЕЛКЕ ВНИЗ =====
   Своя анимация на requestAnimationFrame — нужна, чтобы управлять
   ДЛИТЕЛЬНОСТЬЮ скролла (нативный scrollIntoView её не даёт).
   Меняй SCROLL_DURATION, чтобы сделать скролл быстрее/медленнее. */
const SCROLL_DURATION = 1400; // мс — чем больше, тем медленнее

const downLink = document.querySelector(".promo__down-link");

// плавная кривая: медленный старт и финиш, ускорение в середине
const easeInOutQuad = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const smoothScrollTo = (targetY, duration) => {
  const startY = window.scrollY;
  const distance = targetY - startY;
  let startTime = null;

  const step = (now) => {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuad(progress));
    if (elapsed < duration) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

if (downLink) {
  downLink.addEventListener("click", (e) => {
    const target = document.querySelector(downLink.getAttribute("href"));
    if (target) {
      e.preventDefault();
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(targetY, SCROLL_DURATION);
    }
  });
}

/* ===== "ПРЫГАЮЩЕЕ" СЕРДЕЧКО В КАЛЕНДАРЕ ===== */
const calendar = document.querySelector(".calendar");

if (calendar) {
  const finalCell = calendar.querySelector(".calendar__item--active");

  const days = Array.from(calendar.querySelectorAll(".calendar__item")).filter(
    (cell) =>
      !cell.classList.contains("calendar__item--week") &&
      cell.textContent.trim() !== ""
  );

  let timer = null;
  let current = null;

  const linePath = calendar.querySelector(".calendar__decor--line path");
  if (linePath) {
    const len = linePath.getTotalLength();
    linePath.style.setProperty("--len", len); // длина линии (для dasharray)
    linePath.style.setProperty("--len-neg", -len); // конец диапазона для бесшовного утекания
  }

  const placeHeart = (cell) => {
    days.forEach((d) => d.classList.remove("calendar__item--heart"));
    cell.classList.add("calendar__item--heart");
    current = cell;
  };

  const startHopping = () => {
    clearTimeout(timer);

    const totalHops = 16; // кол-во прыжков сердечка
    let hop = 0;

    const step = () => {
      if (hop < totalHops) {
        let next;
        do {
          next = days[Math.floor(Math.random() * days.length)];
        } while (next === current && days.length > 1);

        placeHeart(next);
        hop++;


        const SLOW_DELAY = 360; // пауза для первых медленных прыжков
        const MIN_DELAY = 120; // самая быстрая пауза в конце
        const STEP = 20; // насколько сокращаем паузу с каждым прыжком
        const delay =
          hop <= 3 ? SLOW_DELAY : Math.max(MIN_DELAY, SLOW_DELAY - (hop - 3) * STEP);
        timer = setTimeout(step, delay);
      } else {
        placeHeart(finalCell);
      }
    };

    step();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          calendar.classList.add("is-visible");
          startHopping();
        } else {
          calendar.classList.remove("is-visible");
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(calendar);
}

/* ===== СЕКЦИЯ "ЛОКАЦИЯ" ===== */
const locationSection = document.querySelector(".location");

if (locationSection) {
  /* --- 1. Выезд картинок при скролле (привязка к прокрутке) ---
     Прогресс --p идёт 0 → 1, пока секция проходит через экран:
       0 — секция только показалась снизу (картинки уведены за края),
       1 — низ секции дошёл до центра экрана (картинки на месте).
     При обратном скролле --p уменьшается → картинки уезжают обратно. */
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  let ticking = false;

  const updatePersons = () => {
    const rect = locationSection.getBoundingClientRect();
    const vh = window.innerHeight;

    // длина «прохода»: от появления низа секон до центра экрана
    const range = vh / 2 + rect.height;
    const p = clamp((vh - rect.top) / range, 0, 1);

    locationSection.style.setProperty("--p", p.toFixed(4));
    ticking = false;
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updatePersons);
    }
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updatePersons(); // стартовое значение

  /* --- 2. Включение свечения лампочек ---
     Класс .is-lit запускает покадровую анимацию «розжига».
     Снимаем при уходе из вида — тогда при возврате эффект повторяется. */
  const lightsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        locationSection.classList.toggle("is-lit", entry.isIntersecting);
      });
    },
    { threshold: 0.35 }
  );

  lightsObserver.observe(locationSection);
}

/* ===== СЕКЦИЯ "ТАЙМИНГ": СТРЕЛА, ГНУЩАЯСЯ ПО ЛИНИИ (lottie-эффект) =====
   Стрела — не жёсткий спрайт, а силуэт, который каждый кадр раскладывается
   вдоль траектории: каждая точка контура смещается на свою точку линии,
   поэтому хвост реально гнётся на поворотах. Всё в координатах оверлея —
   и линия (#timingArrowPath), и стрела (#arrowShape) в одном viewBox. */
const timing = document.querySelector(".timing");

if (timing) {
  const inner = timing.querySelector(".timing__inner");
  const pathEl = inner.querySelector("#timingArrowPath"); // невидимая траектория
  const arrowEl = inner.querySelector("#arrowShape"); // сюда рисуем стрелу

  // Контур твоей стрелы (d из arrow-icon.svg) и её «ось»: хвост → остриё.
  const ARROW_D =
    "M67.1312 49.7016C62.7792 48.9395 58.8982 48.5246 55.6632 46.4083C55.8322 44.6787 57.1662 44.9135 57.6872 44.119C56.8842 43.0654 55.8522 42.3752 54.6802 41.8853L43.7022 33.3697C36.3912 27.692 29.0712 22.0254 21.7472 16.3649L20.6075 15.5334C20.6074 15.5333 20.6074 15.5333 20.6073 15.5332C20.6073 15.5332 -0.377296 0.712213 0.00516518 0.501594C0.387626 0.290975 0.60753 0.181935 1.00517 0.00159419C1.4028 -0.178747 21.7932 15.0016 21.7932 15.0016C30.8842 21.9151 39.6432 29.0138 49.4252 34.896L55.9112 40.3045C57.4462 41.8965 59.1422 43.281 61.2702 44.3589C61.7642 42.6586 60.8102 41.5645 60.6292 40.3267C60.5272 39.6254 60.5852 38.9817 61.3522 38.7479C61.9672 38.5597 62.4622 38.9463 62.6912 39.4645C64.1242 42.7011 65.5142 45.9579 67.1312 49.7016Z";
  const A_TAIL = { x: 0.5, y: 0.25 }; // хвост стрелы (начало оси)
  const A_HEAD = { x: 67.13, y: 49.7 }; // остриё (конец оси)

  const ARROW_LEN = 64; // длина стрелы в координатах линии — это её размер
  const OUTLINE_PTS = 120; // детализация контура (больше = глаже силуэт)
  const STEP = 2; // шаг семплинга траектории, px
  const EXIT = 170; // на сколько px стрела улетает за конец линии и растворяется

  // Триггеры старта полёта и выезжания декора.
  const amur = inner.querySelector(".timing__decor--amur"); // старт стрелы у него
  const pigeon = inner.querySelector(".timing__decor--pigeon"); // финиш у него
  const TRIGGER = 0.75; // линия старта: доля высоты экрана от верха (меньше = позже старт)
  const ENTER_FRAC = 0.4; // за какую долю экрана декор «выезжает» при входе секции

  const NS = "http://www.w3.org/2000/svg";
  const clampT = (v, a, b) => Math.min(Math.max(v, a), b);

  // --- 1) Профиль стрелы: контур в системе (вдоль оси / поперёк оси) ---
  const axis = { x: A_HEAD.x - A_TAIL.x, y: A_HEAD.y - A_TAIL.y };
  const axisLen = Math.hypot(axis.x, axis.y);
  const ax = { x: axis.x / axisLen, y: axis.y / axisLen }; // орт вдоль стрелы
  const px = { x: -ax.y, y: ax.x }; // орт поперёк стрелы
  const scale = ARROW_LEN / axisLen;

  const srcPath = document.createElementNS(NS, "path");
  srcPath.setAttribute("d", ARROW_D);
  const hidden = document.createElementNS(NS, "svg");
  hidden.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
  hidden.appendChild(srcPath);
  document.body.appendChild(hidden);

  const profile = [];
  const srcLen = srcPath.getTotalLength();
  for (let i = 0; i <= OUTLINE_PTS; i++) {
    const pt = srcPath.getPointAtLength((srcLen * i) / OUTLINE_PTS);
    const dx = pt.x - A_TAIL.x;
    const dy = pt.y - A_TAIL.y;
    profile.push({
      along: (dx * ax.x + dy * ax.y) * scale, // позиция вдоль стрелы (0..ARROW_LEN)
      perp: (dx * px.x + dy * px.y) * scale, // смещение вбок от оси
    });
  }
  document.body.removeChild(hidden);

  // --- 2) Таблица точек траектории — быстрый поиск точки по длине ---
  let pathLen = 0;
  let lut = [];
  let startPt, startTan, endPt, endTan; // для экстраполяции за концы линии
  const buildLUT = () => {
    pathLen = pathEl.getTotalLength();
    lut = [];
    for (let l = 0; l <= pathLen; l += STEP) {
      const p = pathEl.getPointAtLength(l);
      lut.push({ x: p.x, y: p.y });
    }
    const e = pathEl.getPointAtLength(pathLen);
    lut.push({ x: e.x, y: e.y });

    // единичные касательные на концах — чтобы продолжать линию за её пределы
    const unit = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const m = Math.hypot(dx, dy) || 1;
      return { x: dx / m, y: dy / m };
    };
    startPt = lut[0];
    startTan = unit(lut[0], lut[1]);
    endPt = lut[lut.length - 1];
    endTan = unit(lut[lut.length - 2], lut[lut.length - 1]);
  };
  const trajAt = (l) => {
    // за пределами линии — продолжаем по касательной (стрела улетает прямо)
    if (l < 0) return { x: startPt.x + startTan.x * l, y: startPt.y + startTan.y * l };
    if (l > pathLen) {
      const o = l - pathLen;
      return { x: endPt.x + endTan.x * o, y: endPt.y + endTan.y * o };
    }
    const f = l / STEP;
    const i = Math.min(Math.floor(f), lut.length - 2);
    const t = f - i;
    const a = lut[i];
    const b = lut[i + 1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const tangentAt = (l) => {
    const a = trajAt(l - 1.5);
    const b = trajAt(l + 1.5);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
  };

  // --- 3) Рендер: раскладываем профиль стрелы вдоль траектории ---
  const render = () => {
    const rect = timing.getBoundingClientRect();
    const vh = window.innerHeight;

    // Лёгкое выезжание декора при входе секции: 0 — секция только показалась
    // снизу, 1 — вошла на ENTER_FRAC высоты экрана.
    const e = clampT((vh - rect.top) / (vh * ENTER_FRAC), 0, 1);
    timing.style.setProperty("--enter", e.toFixed(4));

    if (!pathLen) return;

    // Прогресс полёта привязан к амуру: 0 — амур дошёл до линии-триггера,
    // 1 — до неё дошёл голубь (низ секции). Так стрела стартует ровно у амура.
    let p;
    if (amur && pigeon) {
      const line = TRIGGER * vh;
      const aTop = amur.getBoundingClientRect().top;
      const span = pigeon.getBoundingClientRect().top - aTop;
      p = span > 0 ? clampT((line - aTop) / span, 0, 1) : 0;
    } else {
      p = clampT((vh - rect.top) / (vh + rect.height), 0, 1);
    }

    // голова едет от ARROW_LEN (стрела у старта) до конца линии + EXIT:
    // на последнем отрезке стрела улетает за голубя по касательной.
    const head = ARROW_LEN + p * (pathLen + EXIT - ARROW_LEN);

    let d = "";
    for (let i = 0; i < profile.length; i++) {
      const l = head - ARROW_LEN + profile[i].along;
      const base = trajAt(l);
      const tan = tangentAt(l);
      const nx = -tan.y; // нормаль к траектории
      const ny = tan.x;
      const x = base.x + nx * profile[i].perp;
      const y = base.y + ny * profile[i].perp;
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }
    arrowEl.setAttribute("d", d + "Z");

    // у самого конца стрела растворяется (пока улетает за пределы видимости)
    const overshoot = Math.max(0, head - pathLen);
    arrowEl.style.opacity = (1 - clampT(overshoot / EXIT, 0, 1)).toFixed(3);
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        render();
        ticking = false;
      });
    }
  };
  const recalc = () => {
    buildLUT();
    render();
  };

  if (pathEl && arrowEl) {
    arrowEl.style.opacity = "0"; // прячем до первой раскладки
    recalc();
    window.addEventListener("load", recalc);
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

/* ===== СЕКЦИЯ "АНКЕТА" =====
   Бэкенда нет — просто не даём форме перезагрузить страницу при отправке. */
const surveyForm = document.querySelector(".survey__form");

if (surveyForm) {
  surveyForm.addEventListener("submit", (e) => {
    e.preventDefault();
  });
}

/* ===== ФУТЕР: ФЕЙЕРВЕРК «РАСПУСКАЕТСЯ» СНИЗУ ВВЕРХ =====
   Каждому элементу svg задаём задержку по его вертикали: нижние проявляются
   первыми, верхние — последними. Запуск при попадании футера в кадр. */
const firework = document.querySelector(".footer__firework");

if (firework) {
  const parts = Array.from(firework.querySelectorAll("path"));
  const STAGGER = 1000; // мс — за сколько «прорастает» весь фейерверк снизу вверх

  // центр каждого элемента по вертикали (в координатах svg, y растёт вниз)
  const ys = parts.map((p) => {
    const b = p.getBBox();
    return b.y + b.height / 2;
  });
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;

  parts.forEach((p, i) => {
    // низ (большой y) → задержка 0, верх (малый y) → максимум
    const delay = ((maxY - ys[i]) / range) * STAGGER;
    p.style.setProperty("--d", delay.toFixed(0) + "ms");
  });

  const fwObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        firework.classList.toggle("is-burst", entry.isIntersecting);
      });
    },
    { threshold: 0.3 }
  );

  fwObserver.observe(firework);
}
