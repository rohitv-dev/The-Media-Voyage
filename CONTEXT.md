# Media Voyage

Media Voyage helps a person organize and discover the media in their own library.

## Language

**Hybrid library search**:
A library search that combines lexical matches over catalog content with semantic similarity to find relevant media for a natural-language request.
_Avoid_: Semantic search when referring to the combined behavior

**Lexical match**:
A match based on words present in shared catalog content, such as a title, description, genre, or provider term.
_Avoid_: Web search

**Fuzzy title match**:
A match based on similar character sequences in a catalog title, allowing spelling mistakes or near matches without implying similarity of meaning.
_Avoid_: Semantic match

**Title filter**:
A deterministic library filter on catalog titles that preserves substring matches and can also include fuzzy title matches.
_Avoid_: Hybrid library search

**Semantic match**:
A match based on similarity of meaning between a request and catalog content, even when they do not share the same words.

**Catalog content**:
Shared descriptive information about a canonical media record, including its title, type, description, and provider metadata.
_Avoid_: Personal metadata

**Shared catalog field**:
A catalog attribute available on every canonical media record regardless of media type.

**Personal metadata**:
Information belonging to one library entry or user, such as tags, notes, reviews, ratings, or progress.
