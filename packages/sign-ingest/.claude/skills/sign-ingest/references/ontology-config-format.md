# Ontology Config Format

`sign-ingest` accepts JSON or simple YAML.

```yaml
signSpec: ">=1.0,<2.0"
namespaces:
  doc: SIGN document IDs
  customer: Customer-imported labels
  legacy: Legacy identifiers
predicates:
  depends_on: source requires target
  adjacent_to: source commonly co-occurs with target
documentId:
  prefix: DOC
```

When no ontology is supplied, the CLI runs in freeform mode. In freeform mode, emitted predicates are defined in `@vocab` and extracted identifiers use `customer:` placeholders unless `--coin-ids` is explicitly set.

