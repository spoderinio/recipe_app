import sqlite3
import os

DATABASE = 'recipes.db'

def get_db():
    """Връща връзка към базата данни"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Инициализира базата данни със схемата"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ingredients TEXT NOT NULL,
            instructions TEXT NOT NULL,
            category TEXT DEFAULT 'Други',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def migrate_add_category():
    """Добавя category колона към съществуваща база данни"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Проверка дали колоната вече съществува
        cursor.execute("PRAGMA table_info(recipes)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'category' not in columns:
            cursor.execute('ALTER TABLE recipes ADD COLUMN category TEXT DEFAULT "Други"')
            conn.commit()
            print("✅ Category колоната е добавена успешно!")
        else:
            print("ℹ️  Category колоната вече съществува")
    except Exception as e:
        print(f"❌ Грешка при миграция: {e}")
    finally:
        conn.close()

def add_recipe(name, ingredients, instructions, category='Други'):
    """Добавя нова рецепта"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO recipes (name, ingredients, instructions, category) VALUES (?, ?, ?, ?)',
        (name, ingredients, instructions, category)
    )
    conn.commit()
    recipe_id = cursor.lastrowid
    conn.close()
    return recipe_id

def get_recipe(recipe_id):
    """Връща рецепта по ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM recipes WHERE id = ?', (recipe_id,))
    recipe = cursor.fetchone()
    conn.close()
    return recipe

def get_all_recipes():
    """Връща всички рецепти"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM recipes ORDER BY name COLLATE NOCASE ASC')
    recipes = cursor.fetchall()
    conn.close()
    return recipes

def search_recipes(query):
    """Търси рецепти по име или съставки (case-insensitive)"""
    conn = get_db()
    cursor = conn.cursor()
    search_term = f'%{query}%'  # НЕ преобразуваме query
    cursor.execute(
        '''SELECT * FROM recipes 
           WHERE LOWER(name) LIKE LOWER(?) 
           OR LOWER(ingredients) LIKE LOWER(?) 
           ORDER BY name COLLATE NOCASE ASC''',
        (search_term, search_term)
    )
    recipes = cursor.fetchall()
    conn.close()
    return recipes

def update_recipe(recipe_id, name, ingredients, instructions, category='Други'):
    """Обновява съществуваща рецепта"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        '''UPDATE recipes 
           SET name = ?, ingredients = ?, instructions = ?, category = ? 
           WHERE id = ?''',
        (name, ingredients, instructions, category, recipe_id)
    )
    conn.commit()
    conn.close()

def delete_recipe(recipe_id):
    """Изтрива рецепта"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM recipes WHERE id = ?', (recipe_id,))
    conn.commit()
    conn.close()

def get_all_categories():
    """Връща всички категории с брой рецепти"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        '''SELECT category, COUNT(*) as count 
           FROM recipes 
           GROUP BY category 
           ORDER BY 
               CASE WHEN category = 'Други' THEN 1 ELSE 0 END,
               category COLLATE NOCASE ASC'''
    )
    categories = cursor.fetchall()
    conn.close()
    return categories

def get_recipes_by_category(category):
    """Връща всички рецепти от определена категория"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM recipes WHERE category = ? ORDER BY name COLLATE NOCASE ASC',
        (category,)
    )
    recipes = cursor.fetchall()
    conn.close()
    return recipes

def rename_category(old_name, new_name):
    """Преименува категория (обновява всички рецепти)"""
    if old_name == 'Други':
        return False  # Не може да се преименува системната категория
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE recipes SET category = ? WHERE category = ?',
        (new_name, old_name)
    )
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0

def delete_category(category_name):
    """Изтрива категория (премества рецептите в 'Други')"""
    if category_name == 'Други':
        return False  # Не може да се изтрие системната категория
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE recipes SET category = ? WHERE category = ?',
        ('Други', category_name)
    )
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected >= 0  # Връща True дори ако няма рецепти

# Инициализираме базата данни при import
if __name__ == '__main__':
    init_db()
    migrate_add_category()
    print("База данни инициализирана успешно!")
