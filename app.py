from flask import Flask, render_template, request, jsonify, redirect, url_for
import database

app = Flask(__name__)

# Инициализираме базата данни при стартиране
database.init_db()
database.migrate_add_category()

@app.route('/')
def index():
    """Главна страница - показва категории"""
    categories = database.get_all_categories()
    return render_template('index.html', categories=categories)

@app.route('/category/<category_name>')
def category(category_name):
    """Показва рецепти от определена категория"""
    recipes = database.get_recipes_by_category(category_name)
    return render_template('category.html', category_name=category_name, recipes=recipes)

@app.route('/recipe/<int:recipe_id>')
def recipe(recipe_id):
    """Преглед на конкретна рецепта"""
    recipe = database.get_recipe(recipe_id)
    if recipe:
        return render_template('recipe.html', recipe=recipe)
    return redirect(url_for('index'))

@app.route('/admin')
def admin():
    """Администраторски панел за рецепти"""
    recipes = database.get_all_recipes()
    categories = database.get_all_categories()
    return render_template('admin.html', recipes=recipes, categories=categories)

@app.route('/admin/categories')
def admin_categories():
    """Администраторски панел за категории"""
    categories = database.get_all_categories()
    return render_template('admin_categories.html', categories=categories)

@app.route('/api/search')
def api_search():
    """API endpoint за търсене на рецепти"""
    query = request.args.get('q', '')
    if query:
        recipes = database.search_recipes(query)
    else:
        recipes = database.get_all_recipes()
    
    # Конвертираме Row обекти в речници
    recipes_list = [dict(recipe) for recipe in recipes]
    return jsonify(recipes_list)

@app.route('/api/categories')
def api_categories():
    """API endpoint за получаване на всички категории"""
    categories = database.get_all_categories()
    categories_list = [dict(cat) for cat in categories]
    return jsonify(categories_list)

@app.route('/api/category/<category_name>/recipes')
def api_category_recipes(category_name):
    """API endpoint за получаване на рецепти от категория"""
    recipes = database.get_recipes_by_category(category_name)
    recipes_list = [dict(recipe) for recipe in recipes]
    return jsonify(recipes_list)

@app.route('/api/recipe/<int:recipe_id>')
def api_get_recipe(recipe_id):
    """API endpoint за получаване на рецепта"""
    recipe = database.get_recipe(recipe_id)
    if recipe:
        return jsonify(dict(recipe))
    return jsonify({'error': 'Рецептата не е намерена'}), 404

@app.route('/api/recipe', methods=['POST'])
def api_add_recipe():
    """API endpoint за добавяне на рецепта"""
    data = request.json
    name = data.get('name', '').strip()
    ingredients = data.get('ingredients', '').strip()
    instructions = data.get('instructions', '').strip()
    category = data.get('category', 'Други').strip() or 'Други'
    
    if not name or not ingredients or not instructions:
        return jsonify({'error': 'Всички полета са задължителни'}), 400
    
    recipe_id = database.add_recipe(name, ingredients, instructions, category)
    return jsonify({'id': recipe_id, 'message': 'Рецептата е добавена успешно'})

@app.route('/api/recipe/<int:recipe_id>', methods=['PUT'])
def api_update_recipe(recipe_id):
    """API endpoint за обновяване на рецепта"""
    data = request.json
    name = data.get('name', '').strip()
    ingredients = data.get('ingredients', '').strip()
    instructions = data.get('instructions', '').strip()
    category = data.get('category', 'Други').strip() or 'Други'
    
    if not name or not ingredients or not instructions:
        return jsonify({'error': 'Всички полета са задължителни'}), 400
    
    database.update_recipe(recipe_id, name, ingredients, instructions, category)
    return jsonify({'message': 'Рецептата е обновена успешно'})

@app.route('/api/recipe/<int:recipe_id>', methods=['DELETE'])
def api_delete_recipe(recipe_id):
    """API endpoint за изтриване на рецепта"""
    database.delete_recipe(recipe_id)
    return jsonify({'message': 'Рецептата е изтрита успешно'})

@app.route('/api/category/<category_name>', methods=['PUT'])
def api_rename_category(category_name):
    """API endpoint за преименуване на категория"""
    data = request.json
    new_name = data.get('new_name', '').strip()
    
    if not new_name:
        return jsonify({'error': 'Новото име е задължително'}), 400
    
    if category_name == 'Други':
        return jsonify({'error': 'Не може да преименувате системната категория "Други"'}), 403
    
    success = database.rename_category(category_name, new_name)
    if success:
        return jsonify({'message': 'Категорията е преименувана успешно'})
    return jsonify({'error': 'Категорията не е намерена'}), 404

@app.route('/api/category/<category_name>', methods=['DELETE'])
def api_delete_category(category_name):
    """API endpoint за изтриване на категория"""
    if category_name == 'Други':
        return jsonify({'error': 'Не може да изтриете системната категория "Други"'}), 403
    
    success = database.delete_category(category_name)
    if success:
        return jsonify({'message': 'Категорията е изтрита (рецептите са преместени в "Други")'})
    return jsonify({'error': 'Грешка при изтриване'}), 500

if __name__ == '__main__':
    # За production на Raspberry Pi използвай: host='0.0.0.0', port=5002
    app.run(debug=True, host='0.0.0.0', port=5002)
