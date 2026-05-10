// Массивы для хранения задач и истории состояний
let tasks = [];
let history = [];         // стек состояний для Undo
const MAX_HISTORY = 20;   // максимальное количество шагов отмены
let currentFilter = 'all';

// Элементы DOM
const taskInput = document.getElementById('taskInput');
const assigneeInput = document.getElementById('assigneeInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const filterButtons = document.querySelectorAll('.filter-btn');
const undoButton = document.getElementById('undoButton');

// Загрузка задач и истории из localStorage при старте
function loadData() {
    const storedTasks = localStorage.getItem('teamTodoTasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
    const storedHistory = localStorage.getItem('teamTodoHistory');
    if (storedHistory) {
        history = JSON.parse(storedHistory);
    }
    updateUndoButton();
}
loadData();

// Сохранение задач в localStorage
function saveTasks() {
    localStorage.setItem('teamTodoTasks', JSON.stringify(tasks));
}

// Сохранение истории
function saveHistory() {
    // Ограничиваем размер стека
    if (history.length > MAX_HISTORY) {
        history = history.slice(-MAX_HISTORY);
    }
    localStorage.setItem('teamTodoHistory', JSON.stringify(history));
}

// Сохраняем текущее состояние задач в историю перед изменением
function pushHistory() {
    history.push(JSON.parse(JSON.stringify(tasks)));
    saveHistory();
    updateUndoButton();
}

// Обновление кнопки Undo (активна, если есть история)
function updateUndoButton() {
    undoButton.disabled = history.length === 0;
}

// Функция отмены последнего действия
function undoLastAction() {
    if (history.length === 0) return;
    tasks = history.pop();
    saveTasks();
    saveHistory();
    updateUndoButton();
    renderTasks();
}

// Добавление задачи
function addTask() {
    const taskText = taskInput.value.trim();
    const assignee = assigneeInput.value.trim();
    
    if (taskText === '') {
        alert('Введите текст задачи!');
        return;
    }
    if (assignee === '') {
        alert('Укажите исполнителя!');
        return;
    }
    
    pushHistory();   // сохраняем состояние перед изменением
    
    const task = {
        id: Date.now(),
        text: taskText,
        assignee: assignee,
        completed: false
    };
    
    tasks.push(task);
    saveTasks();
    
    taskInput.value = '';
    assigneeInput.value = '';
    renderTasks();
}

// Отрисовка задач
function renderTasks() {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks;
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) {
            li.classList.add('completed');
        }
        
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-assignee">
                    <span>👤</span> ${escapeHtml(task.assignee)}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn">✏️</button>
                <button class="delete-btn">🗑️</button>
            </div>
        `;
        
        // Обработчики событий
        const checkbox = li.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            pushHistory();
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        });
        
        const editBtn = li.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => enterEditMode(task, li));
        
        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
                pushHistory();
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
            }
        });
        
        taskList.appendChild(li);
    });
    
    updateCounter();
}

// Функция экранирования HTML (предотвращает XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Режим редактирования задачи
function enterEditMode(task, listItem) {
    // Заменяем содержимое на форму редактирования
    listItem.classList.add('editing');
    listItem.innerHTML = `
        <div class="edit-form" style="display: flex; gap: 10px; flex: 1; align-items: center;">
            <input type="text" class="edit-text-input" value="${escapeHtml(task.text)}" 
                   style="flex:2; padding: 10px; border: 2px solid #6c5ce7; border-radius: 8px; font-size: 15px;">
            <input type="text" class="edit-assignee-input" value="${escapeHtml(task.assignee)}" 
                   style="flex:1; padding: 10px; border: 2px solid #6c5ce7; border-radius: 8px; font-size: 15px;">
            <button class="save-edit-btn" style="padding: 10px 18px; background: #00b894; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Сохранить</button>
            <button class="cancel-edit-btn" style="padding: 10px 18px; background: #dfe6e9; border: none; border-radius: 8px; cursor: pointer;">Отмена</button>
        </div>
    `;
    
    const textInput = listItem.querySelector('.edit-text-input');
    const assigneeInput = listItem.querySelector('.edit-assignee-input');
    const saveBtn = listItem.querySelector('.save-edit-btn');
    const cancelBtn = listItem.querySelector('.cancel-edit-btn');
    
    // Фокус на первом поле
    textInput.focus();
    
    // Сохранение изменений
    const saveEdit = () => {
        const newText = textInput.value.trim();
        const newAssignee = assigneeInput.value.trim();
        if (newText === '' || newAssignee === '') {
            alert('Поля не могут быть пустыми!');
            return;
        }
        pushHistory();
        task.text = newText;
        task.assignee = newAssignee;
        saveTasks();
        renderTasks();
    };
    
    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', () => renderTasks());
    
    // Сохранение по Enter в любом поле
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    assigneeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
}

// Счётчик задач
function updateCounter() {
    const activeTasks = tasks.filter(t => !t.completed).length;
    taskCount.textContent = `Всего: ${tasks.length} | Активных: ${activeTasks}`;
}

// Фильтрация
function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    renderTasks();
}

// Обработчики событий
addButton.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
assigneeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

undoButton.addEventListener('click', undoLastAction);

// Первый рендер
renderTasks();
