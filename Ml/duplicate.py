from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load pretrained SBERT model
model = SentenceTransformer("all-MiniLM-L6-v2")


def check_duplicate(problem1, problem2, threshold=0.70):

    # Convert both problem statements into embeddings
    embedding1 = model.encode([problem1])
    embedding2 = model.encode([problem2])

    # Calculating   cosine similarity
    score = cosine_similarity(
        embedding1,
        embedding2
    )[0][0]

    # Classify based on threshold
    if score >= threshold:
        result = "POSSIBLE DUPLICATE"
    else:
        result = "NOT DUPLICATE"

    return score, result

#same problems 

problem1 = """
Given an array of integers, find two numbers whose sum is equal
to a given target value.
"""

problem2 = """
Find a pair of elements in an array whose sum is equal to
the target value.
"""

score, result = check_duplicate(problem1, problem2)

print("TEST 1")
print("Similarity:", round(score, 3))
print("Classification:", result)

#different problems 

problem3 = """
Given a binary tree, find the maximum depth of the tree.
"""

score, result = check_duplicate(problem1, problem3)

print("\nTEST 2")
print("Similarity:", round(score, 3))
print("Classification:", result)