import re


def to_kebab_case(s: str) -> str:
    return "-".join(
        re.sub(
            r"(\s|_|-)+",
            " ",
            re.sub(
                r"[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+",
                lambda mo: " " + mo.group(0).lower(),
                s,
            ),
        ).split()
    )


# FIXME: Should use doctest here
assert to_kebab_case("camelCase") == "camel-case"
assert to_kebab_case("some text") == "some-text"
assert (
    to_kebab_case("some-mixed_string With spaces_underscores-and-hyphens")
    == "some-mixed-string-with-spaces-underscores-and-hyphens"
)
assert to_kebab_case("AllThe-small Things") == "all-the-small-things"
assert to_kebab_case("Gold StainlessSteel") == "gold-stainless-steel"
