/**
 * The character tokenizer, in five cells.
 *
 * Plain Python, no NumPy and no PyTorch: the whole thing is two dicts, and a
 * library version would hide the one idea worth seeing — that the mapping is
 * arbitrary but must be *fixed*.
 *
 * Comments inside `code` are for the reader and gloss what each line does,
 * which is the opposite of this repo's usual rule. See labs/bigram.ts.
 *
 * The last cell is the argument for `sorted`, and it is built rather than
 * observed on purpose. In CPython `list(set(text))` really does change between
 * runs, because the hash seed is randomised per process — but Pyodide starts
 * one interpreter and keeps it, so in this browser the order is stable all
 * session and the demonstration would quietly prove nothing. Constructing a
 * second ordering by hand shows the same consequence and shows it every time.
 */
export const tokenizerLab = () => [
  {
    title: "build the vocabulary",
    lead: "Every distinct character in the text, in a fixed order. This is the whole of what the model will ever be able to read or write — anything outside this list does not exist as far as it is concerned.",
    code: `text = "the cat sat on the mat"

# set() throws the duplicates away and sorted() puts what is left
# into an order that is the same on every machine, every run.
chars = sorted(set(text))

print("vocabulary:", chars)
print("how many:", len(chars))`,
  },
  {
    title: "two tables, pointing opposite ways",
    lead: "One to go from character to number, one to come back. Neither table is clever; the numbers carry no meaning at all beyond being distinct. All that matters is that the two agree.",
    code: `# enumerate hands you (0, ' '), (1, 'a'), (2, 'c')... position and character.
stoi = {ch: i for i, ch in enumerate(chars)}   # string  -> integer
itos = {i: ch for i, ch in enumerate(chars)}   # integer -> string

print("stoi:", stoi)
print("itos:", itos)

# Going out through one table and back through the other must land where
# it started, for every character. If this is False, nothing below works.
print("the tables mirror each other:", all(itos[stoi[ch]] == ch for ch in chars))`,
  },
  {
    title: "encode and decode",
    lead: "Text in, list of numbers out, and back again. Write the round-trip check on the same day you write the pair — it is one line and it catches the mistake below before it reaches anything else.",
    code: `def encode(s):
    return [stoi[ch] for ch in s]          # one number per character

def decode(nums):
    return "".join(itos[n] for n in nums)  # "".join, or you get a list of
                                           # characters instead of a string

sample = "cat sat"
print(repr(sample), "->", encode(sample))
print(encode(sample), "->", repr(decode(encode(sample))))

# The assertion worth writing every time you build an encode/decode pair.
print("round trip:", decode(encode(sample)) == sample)`,
  },
  {
    title: "a character it has never seen",
    lead: "The vocabulary came from one short sentence, so most of the alphabet is missing from it. Asking to encode a character that was never there does not return a placeholder or a zero — it stops.",
    code: `try:
    encode("zebra")
except KeyError as missing:
    print("KeyError:", missing, "- that character was never in the text")

print("all it knows is:", repr("".join(chars)))

# Loud is the right behaviour. A silent stand-in would train the model on a
# character that means nothing, and you would find out much later, if at all.`,
  },
  {
    title: "why the order had to be fixed",
    lead: "The numbers mean nothing on their own — they only mean something against the table that produced them. Here is the same text encoded with a different, equally sensible ordering, then decoded with the original.",
    code: `# Same ten characters, ordered the other way. There is nothing wrong with
# this table. It simply is not the one the numbers were written with.
other = {ch: i for i, ch in enumerate(sorted(chars, reverse=True))}

numbers = [other[ch] for ch in sample]

print("encoded with the other table:", numbers)
print("decoded with the original:   ", repr(decode(numbers)))
print("same text?", decode(numbers) == sample)`,
  },
];
