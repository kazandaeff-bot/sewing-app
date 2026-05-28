#!/usr/bin/env python3
"""Технологическая оценка платформы автоматизации швейного производства"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os, sys

# ─── Font Registration ───
pdfmetrics.registerFont(TTFont('LXGWWenKai', '/usr/share/fonts/truetype/lxgw-wenkai/LXGWWenKai-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', '/usr/share/fonts/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('LXGWWenKai', normal='LXGWWenKai', bold='LXGWWenKai')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ─── Palette ───
ACCENT       = colors.HexColor('#25728c')
TEXT_PRIMARY  = colors.HexColor('#232526')
TEXT_MUTED    = colors.HexColor('#7a8187')
BG_SURFACE   = colors.HexColor('#dfe2e6')
BG_PAGE      = colors.HexColor('#f3f4f5')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Semantic colors
COLOR_CRITICAL = colors.HexColor('#dc2626')
COLOR_WARNING  = colors.HexColor('#d97706')
COLOR_SUCCESS  = colors.HexColor('#059669')
COLOR_INFO     = colors.HexColor('#2563eb')

# ─── Page Setup ───
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.8 * inch
BOT_M = 0.8 * inch
AVAILABLE_W = PAGE_W - LEFT_M - RIGHT_M

OUTPUT_PATH = '/home/z/my-project/download/technologist-assessment.pdf'
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# ─── Styles ───
styles = getSampleStyleSheet()

style_h1 = ParagraphStyle(
    'H1Custom', fontName='NotoSerifSC-Bold', fontSize=18, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT
)
style_h2 = ParagraphStyle(
    'H2Custom', fontName='NotoSerifSC-Bold', fontSize=14, leading=20,
    textColor=ACCENT, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT
)
style_h3 = ParagraphStyle(
    'H3Custom', fontName='NotoSerifSC-Bold', fontSize=12, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT
)
style_body = ParagraphStyle(
    'BodyCustom', fontName='NotoSerifSC', fontSize=10.5, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=6,
    alignment=TA_LEFT, wordWrap='CJK'
)
style_body_indent = ParagraphStyle(
    'BodyIndent', parent=style_body, leftIndent=20
)
style_bullet = ParagraphStyle(
    'BulletCustom', fontName='NotoSerifSC', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=1, spaceAfter=3,
    alignment=TA_LEFT, wordWrap='CJK', leftIndent=20, bulletIndent=8
)
style_note = ParagraphStyle(
    'NoteCustom', fontName='NotoSerifSC', fontSize=9.5, leading=15,
    textColor=TEXT_MUTED, spaceBefore=2, spaceAfter=4,
    alignment=TA_LEFT, wordWrap='CJK', leftIndent=20
)
style_table_header = ParagraphStyle(
    'TableHeader', fontName='NotoSerifSC-Bold', fontSize=10, leading=14,
    textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK'
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK'
)
style_table_cell_center = ParagraphStyle(
    'TableCellCenter', fontName='NotoSerifSC', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, wordWrap='CJK'
)
style_metric = ParagraphStyle(
    'MetricCustom', fontName='NotoSerifSC', fontSize=22, leading=28,
    textColor=ACCENT, spaceBefore=4, spaceAfter=2, alignment=TA_CENTER
)
style_metric_label = ParagraphStyle(
    'MetricLabel', fontName='NotoSerifSC', fontSize=9, leading=13,
    textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=6, alignment=TA_CENTER
)
style_toc_entry = ParagraphStyle(
    'TOCEntry', fontName='NotoSerifSC', fontSize=11, leading=18,
    textColor=TEXT_PRIMARY, spaceBefore=3, spaceAfter=3, leftIndent=20
)

# ─── Helpers ───
def p(text, style=style_body):
    return Paragraph(text, style)

def h1(text):
    return Paragraph(text, style_h1)

def h2(text):
    return Paragraph(text, style_h2)

def h3(text):
    return Paragraph(text, style_h3)

def bullet(text, color_prefix=None):
    if color_prefix:
        return Paragraph(f'<font color="{color_prefix}">&#8226;</font> {text}', style_bullet)
    return Paragraph(f'&#8226; {text}', style_bullet)

def spacer(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BG_SURFACE, spaceBefore=6, spaceAfter=6)

def make_table(headers, rows, col_ratios=None):
    """Create a styled table with headers and rows."""
    if col_ratios is None:
        col_ratios = [1.0 / len(headers)] * len(headers)
    col_widths = [r * AVAILABLE_W for r in col_ratios]
    
    data = [[Paragraph(f'<b>{h}</b>', style_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) for c in row])
    
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def make_metric_block(value, label, color=ACCENT):
    """Create a metric display block."""
    style_m = ParagraphStyle('MetricVal', fontName='NotoSerifSC', fontSize=24, leading=30,
                             textColor=color, alignment=TA_CENTER)
    style_l = ParagraphStyle('MetricLbl', fontName='NotoSerifSC', fontSize=9, leading=13,
                             textColor=TEXT_MUTED, alignment=TA_CENTER)
    return [Paragraph(value, style_m), Paragraph(label, style_l)]

def severity_badge(level):
    """Return colored severity text."""
    colors_map = {
        'CRITICAL': COLOR_CRITICAL,
        'HIGH': COLOR_WARNING,
        'MEDIUM': COLOR_INFO,
        'LOW': COLOR_SUCCESS,
    }
    c = colors_map.get(level, TEXT_MUTED)
    return f'<font color="{c.hexval()}"><b>{level}</b></font>'


# ═══════════════════════════════════════════════════════════
# DOCUMENT
# ═══════════════════════════════════════════════════════════
doc = SimpleDocTemplate(
    OUTPUT_PATH, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M
)

story = []

# ─── COVER PAGE ───
story.append(Spacer(1, 80))
story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=20))
story.append(Paragraph('<b>ТЕХНОЛОГИЧЕСКАЯ ОЦЕНКА</b>', ParagraphStyle(
    'CoverTitle', fontName='NotoSerifSC-Bold', fontSize=28, leading=36,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=8
)))
story.append(Paragraph('Платформа автоматизации швейного производства', ParagraphStyle(
    'CoverSub', fontName='NotoSerifSC', fontSize=16, leading=22,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, spaceAfter=20
)))
story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=30))
story.append(Spacer(1, 20))
story.append(Paragraph('Аудит проведён: 28 мая 2026 г.', ParagraphStyle(
    'CoverMeta', fontName='NotoSerifSC', fontSize=11, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6
)))
story.append(Paragraph('Стек: Next.js 16 + Prisma + SQLite + React', ParagraphStyle(
    'CoverMeta2', fontName='NotoSerifSC', fontSize=11, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6
)))
story.append(Paragraph('URL: https://w1cem4d5ak91-d.space-z.ai/', ParagraphStyle(
    'CoverMeta3', fontName='NotoSerifSC', fontSize=11, leading=16,
    textColor=TEXT_MUTED, alignment=TA_CENTER
)))

# Summary metrics row
story.append(Spacer(1, 50))
metric_data = [
    [Paragraph('<b>7</b>', ParagraphStyle('m1', fontName='NotoSerifSC', fontSize=28, leading=34, textColor=COLOR_CRITICAL, alignment=TA_CENTER)),
     Paragraph('<b>12</b>', ParagraphStyle('m2', fontName='NotoSerifSC', fontSize=28, leading=34, textColor=COLOR_WARNING, alignment=TA_CENTER)),
     Paragraph('<b>6</b>', ParagraphStyle('m3', fontName='NotoSerifSC', fontSize=28, leading=34, textColor=COLOR_INFO, alignment=TA_CENTER)),
     Paragraph('<b>5</b>', ParagraphStyle('m4', fontName='NotoSerifSC', fontSize=28, leading=34, textColor=COLOR_SUCCESS, alignment=TA_CENTER))],
    [Paragraph('Критических<br/>уязвимостей', ParagraphStyle('ml1', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER)),
     Paragraph('Багов<br/>бизнес-логики', ParagraphStyle('ml2', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER)),
     Paragraph('Отсутствующих<br/>функций', ParagraphStyle('ml3', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER)),
     Paragraph('Рабочих<br/>модулей', ParagraphStyle('ml4', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_CENTER))],
]
metric_table = Table(metric_data, colWidths=[AVAILABLE_W/4]*4, hAlign='CENTER')
metric_table.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('TOPPADDING', (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LINEAFTER', (0,0), (2,-1), 0.5, BG_SURFACE),
]))
story.append(metric_table)

story.append(Spacer(1, 60))
story.append(Paragraph('<b>Общая оценка: 4/10</b>  (требуется серьёзная доработка)', ParagraphStyle(
    'OverallScore', fontName='NotoSerifSC-Bold', fontSize=14, leading=20,
    textColor=COLOR_WARNING, alignment=TA_CENTER
)))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════
# SECTION 1: ОБЩАЯ ОЦЕНКА
# ═══════════════════════════════════════════════════════════
story.append(h1('1. Общая оценка платформы'))
story.append(hr())

story.append(p(
    'Платформа автоматизации швейного производства представляет собой веб-приложение, '
    'построенное на современном стеке технологий (Next.js 16, Prisma ORM, SQLite, React с TanStack Query). '
    'Приложение охватывает ключевые этапы швейного производства: от создания плана пошива до распределения '
    'готовой продукции по городам и коробам. Реализована ролевая модель доступа с девятью ролями '
    '(администратор, руководитель, швея, ОТК, закройщик, ВТО, технолог, селлер, заказчик).'
))

story.append(p(
    'С точки зрения технологической организации производства, платформа демонстрирует амбициозный охват '
    'бизнес-процессов, однако текущая реализация содержит ряд критических уязвимостей в безопасности, '
    'существенные ошибки в бизнес-логике и неполные функциональные модули. Положительными аспектами являются: '
    'корректная реализация потока статусов на уровне планов пошива, автоматическое создание раскройных планов '
    'при утверждении, поддержка комплектов с расширением цветов, а также наличие модуля учёта материалов '
    'с нормами расхода и автоматическим списанием при раскрое.'
))

story.append(p(
    'Основные проблемы можно разделить на три категории: (1) критические уязвимости безопасности, '
    'делающие систему непригодной для промышленной эксплуатации без доработки; (2) ошибки в бизнес-логике, '
    'приводящие к некорректным расчётам зарплат, потере данных о частичных сдачах и двойному учёту переделок; '
    '(3) неполные ролевые модули, где три из девяти ролей (технолог, закройщик, селлер) фактически не имеют '
    'функционального интерфейса. Ниже представлен детальный разбор каждого аспекта.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 2: БЕЗОПАСНОСТЬ
# ═══════════════════════════════════════════════════════════
story.append(h1('2. Безопасность (критический приоритет)'))
story.append(hr())

story.append(h2('2.1. Уязвимости аутентификации'))

# S1
story.append(h3('S1. Пароли хранятся в открытом виде'))
story.append(p(
    'Пароли сотрудников хранятся в базе данных SQLite в виде открытого текста и сравниваются прямым '
    'равенством строк (employee.password !== password). Это означает, что любой человек с доступом к файлу '
    'базы данных может прочитать все пароли. Кроме того, API-эндпоинт /api/employees возвращает поле password '
    'в ответе, что делает пароли доступными через сетевой запрос без авторизации. Для промышленной системы '
    'это абсолютно неприемлемо и является нарушением базовых принципов защиты данных.'
))
story.append(bullet('Решение: использовать bcrypt или argon2 для хеширования паролей; исключить поле password из API-ответов.', COLOR_SUCCESS))

# S2
story.append(h3('S2. Сессия на основе Base64 без подписи'))
story.append(p(
    'Сессионный токен представляет собой Base64-кодированный JSON с данными пользователя (id, name, role). '
    'Токен не подписан и не зашифрован. Любой пользователь может декодировать токен, изменить поле role '
    'на "supervisor", закодировать обратно и получить полный административный доступ. Это полностью '
    'обесценивает ролевую модель безопасности, поскольку защита реализована только на уровне UI, '
    'а не на уровне сервера.'
))
story.append(bullet('Решение: подписывать токен HMAC-SHA256 или использовать JWT с серверным секретом.', COLOR_SUCCESS))

# S3
story.append(h3('S3. Cookie сессии не защищена'))
story.append(p(
    'Сессионная cookie устанавливается с флагами httpOnly: false и secure: false. Это означает, что '
    'JavaScript на странице может прочитать и украсть токен (при наличии XSS-уязвимости), а токен '
    'передаётся в открытом виде по HTTP, что позволяет перехватить его через атаки типа man-in-the-middle. '
    'В сочетании с S2 это создаёт тройную уязвимость: токен можно прочитать, подделать и перехватить.'
))
story.append(bullet('Решение: установить httpOnly: true, secure: true, sameSite: "strict".', COLOR_SUCCESS))

# S4
story.append(h3('S4. Отсутствие авторизации на уровне API'))
story.append(p(
    'Из 17 проверенных API-эндпоинтов ни один не требует аутентификации для операций чтения или записи. '
    'Любой неавторизованный пользователь может: создавать и удалять планы пошива, изменять раскройные планы, '
    'создавать швейные задания, добавлять и удалять материалы, управлять сотрудниками. Пользователь с ролью '
    '"швея" может через API создать план пошива, а заказчик может просмотреть данные всех сотрудников, '
    'включая пароли. Только эндпоинты /api/plans и /api/seller-plans проверяют роль для фильтрации по заказчику.'
))
story.append(bullet('Решение: добавить middleware авторизации ко всем API-маршрутам; проверять роль для каждой операции.', COLOR_SUCCESS))

# S5
story.append(h3('S5. localStorage как источник истины для роли'))
story.append(p(
    'Auth-провайдер сохраняет данные пользователя в localStorage и использует их как fallback при '
    'недоступности сервера. Пользователь может вручную изменить свою роль в localStorage, и UI будет '
    'отображать вкладки администратора. Хотя серверная часть в текущем состоянии также не проверяет роли, '
    'исправление S4 без устранения этого fallback-механизма создаст ложное ощущение безопасности.'
))
story.append(bullet('Решение: всегда получать роль с сервера; не доверять localStorage для авторизации.', COLOR_SUCCESS))

# Security summary table
story.append(spacer(12))
story.append(make_table(
    ['#', 'Уязвимость', 'Критичность', 'Статус'],
    [
        ['S1', 'Пароли в открытом виде + утечка через API', severity_badge('CRITICAL'), 'Не исправлено'],
        ['S2', 'Сессия Base64 без подписи (подделка роли)', severity_badge('CRITICAL'), 'Не исправлено'],
        ['S3', 'Cookie без httpOnly/secure', severity_badge('CRITICAL'), 'Не исправлено'],
        ['S4', 'Нет авторизации на API (17 эндпоинтов открыты)', severity_badge('CRITICAL'), 'Не исправлено'],
        ['S5', 'localStorage как источник роли', severity_badge('HIGH'), 'Не исправлено'],
    ],
    col_ratios=[0.06, 0.50, 0.18, 0.26]
))

# ═══════════════════════════════════════════════════════════
# SECTION 3: БИЗНЕС-ЛОГИКА
# ═══════════════════════════════════════════════════════════
story.append(h1('3. Ошибки бизнес-логики'))
story.append(hr())

story.append(h2('3.1. Критические ошибки потока статусов'))

# B1
story.append(h3('B1. submitToQc полностью игнорируется API'))
story.append(p(
    'Интерфейс швеи (SewerTab) отправляет данные с полем submitToQc для частичной сдачи изделий. '
    'Однако PATCH-обработчик /api/sewing-tasks/[id] извлекает только { status, items } - поле submitToQc '
    'молча отбрасывается. Это означает, что когда швея пытается сдать часть изделий (например, 30 из 50), '
    'эти данные теряются, и система не регистрирует частичную сдачу. Для производства, где пошив может '
    'растягиваться на несколько дней, это критический дефект - невозможно отследить промежуточный прогресс.'
))
story.append(bullet('Решение: реализовать обработку submitToQc в PATCH-обработчике; создавать отдельные записи для сданной и оставшейся частей.', COLOR_SUCCESS))

# B2
story.append(h3('B2. Несогласованность статусов задача-элементы'))
story.append(p(
    'При установке статуса задачи в "pending_qc" через PATCH /api/sewing-tasks/[id], элементы задачи '
    'переводятся только в "pending_ironing", но не в "pending_qc". Возникает рассогласование: задача '
    'имеет статус "pending_qc", а её элементы находятся в "pending_ironing". Оператор ВТО видит эти '
    'элементы и может отгладить их, но статус задачи уже говорит о том, что они прошли ВТО. Это приводит '
    'к путанице в производственном процессе и невозможности корректно отследить, на каком этапе находится заказ.'
))
story.append(bullet('Решение: при переводе задачи в "pending_qc" элементы должны проходить через ВТО, затем автоматически переходить в "pending_qc".', COLOR_SUCCESS))

# B3
story.append(h3('B3. Двойной учёт переделок в actualQuantity'))
story.append(p(
    'Когда ОТК одобряет переделку (rework со статусом "completed"), количество переделанных единиц '
    'добавляется к actualQuantity элемента швейного задания. Однако эти единицы уже были учтены в '
    'actualQuantity при первоначальной сдаче швеёй. Таким образом, переделанные изделия учитываются '
    'дважды, что завышает показатели производства и, что более важно, завышает расчёт зарплаты швеи. '
    'Например, если швея сшила 100 изделий, из которых 10 отправлены на переделку и затем одобрены, '
    'система покажет actualQuantity = 110 вместо 100.'
))
story.append(bullet('Решение: при завершении переделки не добавлять количество к actualQuantity; вместо этого вести отдельный учёт переделок.', COLOR_SUCCESS))

# B4
story.append(h3('B4. Нет валидации переходов статусов'))
story.append(p(
    'Отсутствует проверка порядка перехода статусов. Любой статус может быть установлен из любого другого. '
    'Ничто не мешает перевести задание из "issued" напрямую в "completed", минуя все промежуточные этапы, '
    'или вернуть из "completed" обратно в "issued". В реальном производстве это может привести к ситуациям, '
    'когда изделие отмечено как готовое, но фактически не прошло ни пошив, ни ВТО, ни контроль качества. '
    'Также возможен обратный переход, когда уже завершённое производство "откатывается" к начальной стадии.'
))
story.append(bullet('Решение: реализовать конечный автомат (state machine) с разрешёнными переходами; отклонять недопустимые переходы с кодом 400.', COLOR_SUCCESS))

story.append(h2('3.2. Ошибки модуля материалов'))

# B5
story.append(h3('B5. Нет проверки достаточности материалов при раскрое'))
story.append(p(
    'При маркировке раскройного плана как "cut" (раскроен), система автоматически списывает материалы '
    'через операцию decrement на поле totalQty. Однако если на складе недостаточно материала, decrement '
    'приведёт к отрицательному остатку (totalQty уйдёт ниже нуля). Нет предварительной проверки '
    'достаточности запасов. Раскройный план на 1000 изделий с нормой 200 г/шт потребует 200 кг ткани, '
    'даже если на складе всего 50 кг. Система молча создаст отрицательный остаток, который невозможно '
    'интерпретировать в реальном учёте. Это особенно опасно потому, что операция списания не обёрнута '
    'в транзакцию - при ошибке на середине операции данные останутся в неконсистентном состоянии.'
))
story.append(bullet('Решение: перед автосписанием проверять достаточность по каждому материалу; при нехватке возвращать ошибку с перечнем дефицита.', COLOR_SUCCESS))

# B6
story.append(h3('B6. Хрупкая защита от дублирования списания'))
story.append(p(
    'Автосписание материалов проверяет наличие consumed-записей для раскройного плана. Если существует '
    'хотя бы одна такая запись (даже для другого материала), всё автосписание пропускается. Это означает, '
    'что при добавлении нового материала с нормой расхода после первого автосписания, новый материал '
    'не будет списан никогда. Защита от дублирования должна работать на уровне отдельных материалов, '
    'а не на уровне всего раскройного плана. В противном случае система будет накапливать расхождения '
    'между плановым и фактическим расходом материалов.'
))
story.append(bullet('Решение: проверять дублирование по паре (cuttingPlanId, materialId), а не только по cuttingPlanId.', COLOR_SUCCESS))

# B7
story.append(h3('B7. Агрессивное удаление остатков кроя'))
story.append(p(
    'При уменьшении фактического количества до планового или ниже, система удаляет ВСЕ остатки кроя '
    '(CuttingLeftover), включая добавленные вручную с source="manual". Это уничтожает пользовательские '
    'данные, которые были введены целенаправленно. Ручные остатки могут представлять ценность - например, '
    'зарисовки на пустых участках ткани, которые планируется использовать для других заказов. Их удаление '
    'без предупреждения неприемлемо для производственного учёта.'
))
story.append(bullet('Решение: удалять только автоматически созданные остатки (source="cutting"); ручные остатки помечать, но не удалять.', COLOR_SUCCESS))

story.append(h2('3.3. Ошибки модуля ВТО и зарплат'))

# B8
story.append(h3('B8. Зарплата ВТО по hardcoded ставке'))
story.append(p(
    'Расчёт зарплаты утюжки использует константу IRONING_RATE = 10 рублей за единицу вместо '
    'продуктовой ставки product.ironingRate и размерных коэффициентов из ProductSizeRate. Поскольку '
    'разные изделия могут иметь существенно разные трудозатраты на утюжку (например, платье-макси '
    'и топка), плоская ставка приводит к несправедливой оплате труда. Кроме того, система игнорирует '
    'размерные надбавки, которые уже реализованы в модели ProductSizeRate, но не используются при расчётах.'
))
story.append(bullet('Решение: использовать product.ironingRate с fallback на 10 руб.; применять размерные коэффициенты из ProductSizeRate.', COLOR_SUCCESS))

# B9
story.append(h3('B9. Нет привязки глажки к конкретному работнику'))
story.append(p(
    'В модели SewingTaskItem отсутствует поле ironedBy (кто отгладил). Зарплата ВТО рассчитывается '
    'по всем изделиям в статусе "pending_qc" или "completed", без привязки к конкретному утюжильщику. '
    'Если в смене работают несколько работников ВТО, невозможно определить, кто обработал какие изделия, '
    'и, соответственно, корректно рассчитать зарплату каждого. Это делает модуль зарплаты ВТО '
    'непригодным для использования при наличии более одного работника.'
))
story.append(bullet('Решение: добавить поле ironedBy (String?) в SewingTaskItem; фиксировать работника при операции глажки.', COLOR_SUCCESS))

# B10
story.append(h3('B10. Переделки невидимы для ОТК'))
story.append(p(
    'Когда переделка переходит в статус "pending_qc", родительское задание не обновляется. '
    'Оператор ОТК видит только задания в статусе "pending_qc", но переделка находится внутри '
    'завершённого задания и не видна в стандартном потоке. Для обнаружения переделок ОТК должен '
    'специально фильтровать по ним, что в текущем UI не реализовано. В результате переделанные '
    'изделия могут пройти весь цикл без повторного контроля качества, что недопустимо для '
    'производства, работающего с массовыми заказами.'
))
story.append(bullet('Решение: при переходе переделки в "pending_qc" обновлять родительское задание; добавить вкладку переделок в интерфейс ОТК.', COLOR_SUCCESS))

# B11
story.append(h3('B11. Нет валидации actualQty при раскрое'))
story.append(p(
    'Раскройный план можно отметить как "раскроен" с нулевыми или отсутствующими значениями actualQty. '
    'Также нет проверки на отрицательные значения. Это позволяет создать раскройный план с фактическим '
    'количеством -5 или 0, что не имеет физического смысла. В сочетании с автоматическим созданием '
    'швейных заданий из раскройных позиций, это может привести к заданию с нулевым или отрицательным '
    'количеством изделий, что полностью ломает логику последующих этапов.'
))
story.append(bullet('Решение: требовать actualQty > 0 для каждой позиции при маркировке "cut"; отклонять некорректные значения.', COLOR_SUCCESS))

# Bugs summary table
story.append(spacer(12))
story.append(make_table(
    ['#', 'Ошибка', 'Модуль', 'Критичность'],
    [
        ['B1', 'submitToQc игнорируется API', 'Швейные задания', severity_badge('CRITICAL')],
        ['B2', 'Несогласованность статусов задача/элементы', 'Статусы', severity_badge('HIGH')],
        ['B3', 'Двойной учёт переделок', 'Зарплата', severity_badge('HIGH')],
        ['B4', 'Нет валидации переходов статусов', 'Статусы', severity_badge('HIGH')],
        ['B5', 'Отрицательный остаток материалов', 'Материалы', severity_badge('HIGH')],
        ['B6', 'Хрупкая защита от дублей списания', 'Материалы', severity_badge('MEDIUM')],
        ['B7', 'Удаление ручных остатков кроя', 'Раскрой', severity_badge('MEDIUM')],
        ['B8', 'Hardcoded ставка ВТО', 'Зарплата', severity_badge('MEDIUM')],
        ['B9', 'Нет привязки глажки к работнику', 'ВТО/Зарплата', severity_badge('MEDIUM')],
        ['B10', 'Переделки невидимы для ОТК', 'ОТК', severity_badge('HIGH')],
        ['B11', 'Нет валидации actualQty', 'Раскрой', severity_badge('MEDIUM')],
    ],
    col_ratios=[0.06, 0.42, 0.20, 0.32]
))

# ═══════════════════════════════════════════════════════════
# SECTION 4: ЦЕЛОСТНОСТЬ ДАННЫХ
# ═══════════════════════════════════════════════════════════
story.append(h1('4. Целостность данных'))
story.append(hr())

story.append(p(
    'Многошаговые операции, затрагивающие несколько записей в базе данных, не обёрнуты в транзакции Prisma. '
    'Это создаёт риск неконсистентного состояния данных при сбоях. Ниже перечислены операции, требующие '
    'транзакционной обёртки, но её не имеющие:'
))

story.append(bullet('Автосписание материалов при раскрое: создаёт несколько MaterialEntry и обновляет несколько Material без транзакции. Сбой на середине приведёт к частичному списанию.', COLOR_WARNING))
story.append(bullet('Утверждение плана: обновляет статус плана и создаёт раскройный план с позициями. При ошибке создания раскроя план останется "approved" без раскройного плана.', COLOR_WARNING))
story.append(bullet('Удаление швейного задания: удаляет переделки, элементы, затем само задание. Ошибка на середине оставит "сиротские" записи.', COLOR_WARNING))
story.append(bullet('Пакетная утюжка: обновляет несколько элементов и задач. Частичный сбой создаёт рассогласование статусов.', COLOR_WARNING))
story.append(bullet('Завершение переделки: обновляет переделку и модифицирует actualQuantity элемента. Неконсистентность при сбое второго шага.', COLOR_WARNING))

story.append(spacer(6))
story.append(p(
    'Кроме того, паттерн "прочитать-изменить-записать" (read-modify-write) не является атомарным. '
    'Например, проверка существования consumed-записей перед автосписанием и последующее создание '
    'новых записей - это два отдельных запроса, между которыми может выполниться другой запрос, '
    'что приведёт к дублированию. Рекомендуется обернуть все многошаговые операции в db.$transaction() '
    'и добавить уникальные индексы для предотвращения дублирования на уровне базы данных.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 5: РОЛЕВАЯ МОДЕЛЬ
# ═══════════════════════════════════════════════════════════
story.append(h1('5. Ролевая модель и UI'))
story.append(hr())

story.append(p(
    'Система определяет девять ролей, но только пять из них имеют полноценный функционал. '
    'Три роли представлены заглушками ("Раздел в разработке"), а одна роль не имеет выделенного интерфейса. '
    'Это существенно ограничивает практическую применимость системы для реального производства.'
))

story.append(make_table(
    ['Роль', 'UI-доступ', 'Функционал', 'Статус'],
    [
        ['Администратор', 'Все вкладки', 'Полное управление', severity_badge('LOW')],
        ['Руководитель', 'Все вкладки', 'Мониторинг + управление', severity_badge('LOW')],
        ['Швея', 'SewerTab', 'Задания, зарплата, тайминг', severity_badge('LOW')],
        ['ОТК', 'QCTab', 'Приёмка, переделки', severity_badge('LOW')],
        ['ВТО', 'IroningTab', 'Утюжка, зарплата', severity_badge('LOW')],
        ['Заказчик', 'Планы + материалы', 'Просмотр балансов', severity_badge('LOW')],
        ['Технолог', 'StubTab', 'Заглушка', severity_badge('HIGH')],
        ['Закройщик', 'StubTab', 'Заглушка', severity_badge('HIGH')],
        ['Селлер', 'Нет вкладки', 'Перенаправление', severity_badge('MEDIUM')],
    ],
    col_ratios=[0.16, 0.22, 0.32, 0.30]
))

story.append(spacer(8))
story.append(p(
    'Наиболее критичным является отсутствие интерфейса закройщика. Раскрой - один из ключевых этапов '
    'производства, но закройщик не может ввести фактические количества, отметить дефекты ткани или '
    'управлять раскройными планами. Вся работа с раскроем сейчас выполняется через интерфейс '
    'администратора, что не соответствует реальному разделению труда на швейном производстве. '
    'Технолог также не имеет доступа к управлению нормами расхода материалов, аналитике производства '
    'и настройке технологических процессов - всё это делается через администратора.'
))

# ═══════════════════════════════════════════════════════════
# SECTION 6: ЧТО РАБОТАЕТ ХОРОШО
# ═══════════════════════════════════════════════════════════
story.append(h1('6. Сильные стороны реализации'))
story.append(hr())

story.append(p(
    'Несмотря на выявленные проблемы, платформа содержит ряд хорошо реализованных функциональных блоков, '
    'которые составляют прочную основу для дальнейшего развития. Ниже перечислены модули и механизмы, '
    'работающие корректно и соответствующие требованиям производственного учёта.'
))

strengths = [
    ('Поток статусов планов', 'Последовательность draft - approved - in_work - shipped - shipped_paid реализована корректно с защитой от недопустимых операций (например, нельзя удалить утверждённый план).'),
    ('Автоматическое создание раскроев', 'При утверждении плана автоматически создаётся раскройный план с расширением комплектов (например, ч/б разбирается на чёрный и белый). Дополнительные раскройные планы получают метку "Дополнение 1".'),
    ('Учёт материалов', 'Полный цикл: CRUD для типов материалов, материалов, записей движения (incoming/consumed), норм расхода. Поддержка ручного добавления прихода и автоматического списания при раскрое.'),
    ('Баланс материалов для заказчика', 'Фильтрация по продуктам заказчика с контролем видимости через флаг showMaterialBalance. Заказчик видит только релевантные ему материалы.'),
    ('Остатки кроя', 'Автоматическое создание остатков при actualQty > plannedQty. Отдельный интерфейс управления остатками с пошаговым использованием.'),
    ('Распределение по коробам', 'Автоматическое распределение изделий по коробам с учётом вместимости. Поддержка типов коробов с размерными ограничителями.'),
    ('Ролевой UI', 'Каждая роль видит только релевантные вкладки. Швея не видит административных функций, ОТК не видит раскрой, заказчик видит только свои данные.'),
    ('Тайминг операций', 'Для каждого элемента швейного задания фиксируются метки времени: startedAt, ironedAt, qcAt, completedAt. Это позволяет анализировать производительность.'),
    ('Приоритизация и дедлайны', 'Планы пошива имеют поле priority (urgent/normal/low) и deadline. В UI отображаются бейджи приоритета и оставшееся время до дедлайна.'),
    ('Фото изделий', 'Загрузка изображений изделий через API /api/upload с поддержкой jpg/png/gif/webp до 5 МБ. Фото привязывается к карточке продукта.'),
]

for title, desc in strengths:
    story.append(bullet(f'<b>{title}</b>: {desc}', COLOR_SUCCESS))

# ═══════════════════════════════════════════════════════════
# SECTION 7: ПЛАН ДОРАБОТКИ
# ═══════════════════════════════════════════════════════════
story.append(h1('7. План доработки по приоритетам'))
story.append(hr())

story.append(p(
    'Ниже представлен план доработки, разделённый на четыре приоритетных уровня. Оценка трудозатрат '
    'указана в человеко-днях для одного разработчика. Рекомендуется выполнять доработки строго по '
    'приоритетам, начиная с критических, поскольку без устранения уязвимостей безопасности система '
    'не может быть использована в промышленной эксплуатации.'
))

story.append(h2('P0 - Критический (1-2 недели)'))

p0_items = [
    ('P0.1', 'Хеширование паролей (bcrypt)', '2 дня', 'Заменить прямое сравнение на bcrypt.verify(); исключить password из API-ответов'),
    ('P0.2', 'Подпись сессионных токенов (HMAC-SHA256)', '1 день', 'Подписывать Base64-токен HMAC; проверять подпись при каждом запросе'),
    ('P0.3', 'Защита cookie (httpOnly + secure)', '0.5 дня', 'Установить httpOnly: true, secure: true, sameSite: strict'),
    ('P0.4', 'API-авторизация (middleware)', '3 дня', 'Добавить проверку сессии и роли ко всем API-маршрутам'),
    ('P0.5', 'Исправить submitToQc (B1)', '2 дня', 'Реализовать обработку частичной сдачи в PATCH /sewing-tasks/[id]'),
    ('P0.6', 'Проверка достаточности материалов (B5)', '1 день', 'Предварительная проверка stock перед автосписанием; возврат ошибки при нехватке'),
    ('P0.7', 'Обёртка операций в транзакции', '2 дня', 'Обернуть 5 критических многошаговых операций в db.$transaction()'),
]

story.append(make_table(
    ['ID', 'Задача', 'Срок', 'Описание'],
    p0_items,
    col_ratios=[0.07, 0.30, 0.10, 0.53]
))

story.append(h2('P1 - Высокий (2-3 недели)'))

p1_items = [
    ('P1.1', 'Валидация переходов статусов (B4)', '2 дня', 'Конечный автомат с разрешёнными переходами; отклонение невалидных с 400'),
    ('P1.2', 'Согласованность задача/элементы (B2)', '1 день', 'Корректный перевод элементов при смене статуса задачи'),
    ('P1.3', 'Устранение двойного учёта переделок (B3)', '1 день', 'Не добавлять rework.qty к actualQuantity при завершении переделки'),
    ('P1.4', 'Переделки в интерфейсе ОТК (B10)', '2 дня', 'Отдельная секция переделок на вкладке ОТК; обновление родительского задания'),
    ('P1.5', 'Интерфейс закройщика', '5 дней', 'Полноценная вкладка: раскройные планы, ввод actualQty, дефекты ткани'),
    ('P1.6', 'Интерфейс технолога', '5 дней', 'Нормы расхода, аналитика производства, настройка процессов'),
    ('P1.7', 'Добавить ironedBy в SewingTaskItem (B9)', '1 день', 'Новое поле + фиксация работника ВТО при операции глажки'),
]

story.append(make_table(
    ['ID', 'Задача', 'Срок', 'Описание'],
    p1_items,
    col_ratios=[0.07, 0.30, 0.10, 0.53]
))

story.append(h2('P2 - Средний (3-4 недели)'))

p2_items = [
    ('P2.1', 'Продуктовая ставка ВТО (B8)', '1 день', 'Использовать product.ironingRate с размерными коэффициентами'),
    ('P2.2', 'Защита от дублей списания (B6)', '1 день', 'Проверка по (cuttingPlanId, materialId) вместо только cuttingPlanId'),
    ('P2.3', 'Сохранение ручных остатков (B7)', '0.5 дня', 'Удалять только source=cutting остатки; помечать manual'),
    ('P2.4', 'Валидация actualQty (B11)', '0.5 дня', 'Требовать actualQty > 0 при маркировке "cut"'),
    ('P2.5', 'Резервирование материалов', '3 дня', 'Бронирование при утверждении плана; автоматический расчёт потребности'),
    ('P2.6', 'Оповещения о нехватке материалов', '2 дня', 'Пороговые значения; уведомления на дашборде руководителя'),
    ('P2.7', 'Аналитика производства', '5 дней', 'Дашборд: среднее время по этапам, загрузка работников, дефектность'),
]

story.append(make_table(
    ['ID', 'Задача', 'Срок', 'Описание'],
    p2_items,
    col_ratios=[0.07, 0.30, 0.10, 0.53]
))

story.append(h2('P3 - Низкий (по возможности)'))

p3_items = [
    ('P3.1', 'Интерфейс селлера', '3 дня', 'Просмотр распределения по городам и коробам для своей территории'),
    ('P3.2', 'Конвертация единиц измерения', '2 дня', 'Валидация совместимости единиц между нормами и материалами'),
    ('P3.3', 'Рефакторинг production-tabs.tsx', '3 дня', 'Разделить 4700 строк на отдельные компоненты по вкладкам'),
    ('P3.4', 'Ограничения на уровне БД', '1 день', 'CHECK-константы: totalQty >= 0, actualQty <= quantity и т.д.'),
    ('P3.5', 'Управление рулонами ткани', '5 дней', 'Привязка раскроя к конкретным рулонам; учёт остатков на рулоне'),
]

story.append(make_table(
    ['ID', 'Задача', 'Срок', 'Описание'],
    p3_items,
    col_ratios=[0.07, 0.30, 0.10, 0.53]
))

# ═══════════════════════════════════════════════════════════
# SECTION 8: ЗАКЛЮЧЕНИЕ
# ═══════════════════════════════════════════════════════════
story.append(h1('8. Заключение'))
story.append(hr())

story.append(p(
    'Платформа автоматизации швейного производства демонстрирует амбициозный замысел и охват ключевых '
    'бизнес-процессов швейного предприятия. Архитектурные решения (Next.js с серверными компонентами, '
    'Prisma ORM, ролевая модель) выбраны обоснованно и позволяют масштабировать систему. Реализованные '
    'модули - от создания планов пошива до распределения по коробам - образуют полный производственный '
    'цикл, что является весомым достижением для проекта текущего масштаба.'
))

story.append(p(
    'Однако текущее состояние системы не позволяет рекомендовать её к промышленной эксплуатации. '
    'Пять критических уязвимостей безопасности (открытые пароли, неподписанные сессии, отсутствие '
    'авторизации на API) делают систему уязвимой для злоумышленников и внутренних угроз. Одиннадцать '
    'ошибок бизнес-логики приводят к некорректным расчётам зарплат, потере данных о частичных сдачах '
    'и двойному учёту переделок. Три из девяти ролей не имеют функционального интерфейса.'
))

story.append(p(
    'При выполнении плана доработки P0 (критический приоритет, ориентировочно 1-2 недели) система '
    'перейдёт из состояния "непригодна" в "минимально жизнеспособна". Выполнение P1 (высокий приоритет, '
    'ещё 2-3 недели) позволит полноценно использовать систему на производстве с полным набором ролей '
    'и корректной бизнес-логикой. Рекомендую prioritизировать безопасность и целостность данных '
    'над добавлением нового функционала - без фундамента надстройка будет ненадёжной.'
))

# ─── BUILD ───
doc.build(story)
print(f"PDF generated: {OUTPUT_PATH}")
print(f"Size: {os.path.getsize(OUTPUT_PATH)} bytes")
