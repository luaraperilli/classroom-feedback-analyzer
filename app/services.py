from pysentimiento import create_analyzer

sentiment_analyzer = create_analyzer(task="sentiment", lang="pt")

def analyze_sentiment_text(text: str) -> dict:
    if not isinstance(text, str) or not text.strip():
        return {'compound': 0.0, 'neg': 0.0, 'neu': 1.0, 'pos': 0.0}

    result = sentiment_analyzer.predict(text)
    probabilities = result.probas
    
    # Calculates a compound score, which is the difference between the probability of being positive and negative
    compound_score = probabilities.get('POS', 0.0) - probabilities.get('NEG', 0.0)

    return {
        'compound': round(compound_score, 4),
        'neg': round(probabilities.get('NEG', 0.0), 4),
        'neu': round(probabilities.get('NEU', 0.0), 4),
        'pos': round(probabilities.get('POS', 0.0), 4)
    }