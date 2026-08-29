import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)


def generate_fallback_recipes(ingredient_names):
    """
    Returns clean, structured fallback recipes if Groq API key is not configured or API call fails.
    """
    ingredients_str = ", ".join(ingredient_names) if ingredient_names else "Fresh Ingredients"
    return [
        {
            "title": f"Quick {ingredient_names[0] if ingredient_names else 'Smart'} Skillet Delight",
            "ingredients_used": ingredient_names[:2],
            "steps": [
                f"Combine {ingredients_str} in a skillet over medium heat.",
                "Sauté for 5-7 minutes until cooked through.",
                "Season with salt and pepper to taste and serve warm."
            ]
        },
        {
            "title": "Fresh Inventory Mix Salad / Bowl",
            "ingredients_used": ingredient_names,
            "steps": [
                f"Prep and chop {ingredients_str}.",
                "Toss with olive oil, lemon juice, or your choice of dressing.",
                "Enjoy immediately to make the most of fresh ingredients before expiry."
            ]
        }
    ]


def generate_recipes_from_ingredients(ingredient_names):
    """
    Sends ingredient names to Groq API asking for 2-3 simple recipes.
    Handles all errors gracefully without raising raw server errors.
    """
    if not ingredient_names:
        return []

    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key or groq_api_key.startswith('your_'):
        logger.info("[GROQ DEV MOCK] GROQ_API_KEY not configured. Returning fallback recipes.")
        return generate_fallback_recipes(ingredient_names)

    prompt = (
        f"You are a helpful culinary AI assistant. The user has the following near-expiry ingredients: "
        f"{', '.join(ingredient_names)}. "
        f"Suggest 2 to 3 simple, easy-to-cook recipes using these ingredients. "
        f"Return ONLY a JSON object with a 'recipes' key containing an array of objects. "
        f"Each recipe object must contain exactly: "
        f"'title' (string), 'ingredients_used' (array of strings), and 'steps' (array of string steps)."
    )

    try:
        client = Groq(api_key=groq_api_key)
        models_to_try = ["openai/gpt-oss-20b", "groq/compound", "qwen/qwen3.6-27b"]
        chat_completion = None
        for m in models_to_try:
            try:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a professional chef assistant providing JSON outputs."},
                        {"role": "user", "content": prompt}
                    ],
                    model=m,
                    temperature=0.7,
                    response_format={"type": "json_object"}
                )
                if chat_completion:
                    break
            except Exception as me:
                logger.warning(f"Groq model {m} failed: {str(me)}")
                continue

        if not chat_completion:
            return generate_fallback_recipes(ingredient_names)


        response_content = chat_completion.choices[0].message.content
        parsed = json.loads(response_content)
        recipes = parsed.get('recipes', [])

        if isinstance(recipes, list) and len(recipes) > 0:
            return recipes
        return generate_fallback_recipes(ingredient_names)

    except Exception as e:
        logger.error(f"Groq API call failed: {str(e)}")
        print(f"[GROQ ERROR] Gracefully handling Groq API failure: {str(e)}")
        return generate_fallback_recipes(ingredient_names)


def chat_with_recipe_assistant(messages, customer_inventory=None):
    """
    Sends conversation history to Groq API for interactive ChatGPT-style cooking chat.
    Injects customer inventory context if available.
    """
    groq_api_key = os.getenv('GROQ_API_KEY')

    inventory_context = ""
    if customer_inventory and len(customer_inventory) > 0:
        inventory_str = ", ".join(customer_inventory)
        inventory_context = f" The customer currently has these items in their purchased inventory: {inventory_str}."

    system_prompt = (
        "You are Chef Smarty 👨‍🍳, a friendly, world-class culinary AI assistant for Smart Shelf."
        "You help users with cooking tips, delicious recipe ideas, ingredient substitutions, step-by-step instructions, and meal planning."
        f"{inventory_context} "
        "Keep your tone warm, encouraging, and helpful. Use clear formatting, bullet points, and emojis."
    )

    full_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
            role = 'assistant' if msg['role'] == 'assistant' else 'user'
            full_messages.append({"role": role, "content": msg['content']})

    if not groq_api_key or groq_api_key.startswith('your_'):
        last_user_msg = messages[-1]['content'] if messages else "cooking ideas"
        return f"Chef Smarty 👨‍🍳: Great question! Here is a quick tip for '{last_user_msg}': Try combining your fresh ingredients with olive oil, herbs, and garlic for a quick 10-minute skillet meal!"

    try:
        client = Groq(api_key=groq_api_key)
        models_to_try = ["openai/gpt-oss-20b", "groq/compound", "qwen/qwen3.6-27b"]
        for m in models_to_try:
            try:
                completion = client.chat.completions.create(
                    messages=full_messages,
                    model=m,
                    temperature=0.7,
                    max_tokens=800
                )
                if completion and completion.choices:
                    return completion.choices[0].message.content
            except Exception as me:
                logger.warning(f"Groq chat model {m} failed: {str(me)}")
                continue

        return "Chef Smarty 👨‍🍳: I am here to help you cook! What ingredients or recipe ideas would you like to explore today?"

    except Exception as e:
        logger.error(f"Groq Chat API call failed: {str(e)}")
        return "Chef Smarty 👨‍🍳: I'm currently adjusting my recipes! Feel free to ask me anything about your ingredients or meal ideas."

